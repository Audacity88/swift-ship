import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

// Types
interface CreateTicketResult {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  customer_id: string
  assignee_id: string | null
  created_at: string
  updated_at: string
}

// Validation schema for creating a ticket
const createTicketSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.URGENT
  ]),
  customerId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional()
})

const ticketFiltersSchema = z.object({
  status: z.string().array().optional(),
  priority: z.string().array().optional(),
  type: z.string().optional(),
  search: z.string().nullish(),
  dateFrom: z.string().nullish(),
  dateTo: z.string().nullish()
})

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10)
})

const sortingSchema = z.object({
  sortField: z.string().default('created_at'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

const initSupabase = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting error
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal error
          }
        },
      },
    }
  )
}

// GET /api/tickets - Get tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate filters
    const filters = ticketFiltersSchema.parse({
      status: searchParams.get('status')?.split(','),
      priority: searchParams.get('priority')?.split(','),
      type: searchParams.get('type'),
      search: searchParams.get('search'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo')
    })

    // Parse pagination with defaults
    const { page, pageSize } = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '10'
    })

    // Parse sorting with defaults
    const { sortField, sortDirection } = sortingSchema.parse({
      sortField: searchParams.get('sortField') || 'created_at',
      sortDirection: searchParams.get('sortDirection') || 'desc'
    })

    // Convert camelCase to snake_case for sorting
    const dbSortField = sortField.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

    // Start building the query
    let query = supabase
      .from('tickets')
      .select(`
        id,
        title,
        status,
        priority,
        created_at,
        type,
        customer:customers(*),
        assignee:agents!tickets_assignee_id_fkey(*)
      `, { count: 'exact' })

    // If user is not an admin, only show tickets assigned to them
    if (user.type === 'agent' && user.role !== 'admin') {
      query = query.eq('assignee_id', user.id)
    }

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.priority?.length) {
      query = query.in('priority', filters.priority)
    }
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    // Apply pagination and sorting
    const { data: tickets, count, error: ticketsError } = await query
      .order(dbSortField, { ascending: sortDirection === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (ticketsError) {
      console.error('Failed to fetch tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: tickets,
      total: count || 0,
      page,
      pageSize
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = createTicketSchema.parse(json)

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title: body.title,
        description: body.description,
        status: TicketStatus.OPEN,
        priority: body.priority,
        customer_id: body.customerId,
        assignee_id: body.assigneeId || null,
        metadata: body.metadata || {},
        type: 'question', // Default type
        source: 'web' // Default source
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Failed to create ticket:', ticketError)
      throw ticketError
    }

    // Add tags if provided
    if (body.tags?.length) {
      const { error: tagsError } = await supabase
        .from('ticket_tags')
        .insert(
          body.tags.map(tagId => ({
            ticket_id: ticket.id,
            tag_id: tagId
          }))
        )
      if (tagsError) {
        console.error('Failed to add tags:', tagsError)
        throw tagsError
      }
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        ticket_id: ticket.id,
        actor_id: user.id,
        action: 'create',
        metadata: {
          title: body.title,
          description: body.description,
          priority: body.priority,
          customerId: body.customerId,
          assigneeId: body.assigneeId,
          tags: body.tags
        }
      })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't throw since the ticket was created successfully
    }

    return NextResponse.json({ data: ticket })
  } catch (error) {
    console.error('Failed to create ticket:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
} 