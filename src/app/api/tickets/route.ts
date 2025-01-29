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
  dateTo: z.string().nullish(),
  unassigned: z.boolean().optional(),
  assignedToMe: z.boolean().optional()
})

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10)
})

const sortingSchema = z.object({
  sortField: z.string().default('created_at'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

const initSupabase = async (request?: NextRequest) => {
  const cookieStore = await cookies()
  
  const options: any = {
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

  // If request is provided, check for Authorization header
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      options.global = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  }
  
  // Use service role key for server-side operations
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    options
  )
}

// GET /api/tickets - Get tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    try {
      // Parse and validate filters
      const filters = ticketFiltersSchema.parse({
        status: searchParams.getAll('status'),
        priority: searchParams.getAll('priority'),
        type: searchParams.get('type'),
        search: searchParams.get('search'),
        dateFrom: searchParams.get('dateFrom'),
        dateTo: searchParams.get('dateTo'),
        unassigned: searchParams.get('unassigned') === 'true',
        assignedToMe: searchParams.get('assignedToMe') === 'true'
      })

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

      // Apply filters
      if (filters.status?.length) {
        console.log('Applying status filter:', filters.status)
        query = query.in('status', filters.status)
      }
      if (filters.priority?.length) {
        console.log('Applying priority filter:', filters.priority)
        query = query.in('priority', filters.priority)
      }
      if (filters.unassigned) {
        console.log('Applying unassigned filter')
        query = query.is('assignee_id', null)
      }
      if (filters.assignedToMe) {
        console.log('Applying assigned to me filter')
        query = query.eq('assignee_id', user.id)
      }

      // Add sorting
      const sortField = searchParams.get('sortField') || 'created_at'

      // Execute query
      console.log('Executing query...')
      const { data: tickets, count, error: ticketsError } = await query
        .order(sortField, { ascending: false })

      if (ticketsError) {
        console.error('Database error:', ticketsError)
        throw ticketsError
      }

      console.log('Query results:', { count, ticketsCount: tickets?.length })

      return NextResponse.json({
        data: tickets,
        total: count || 0
      })

    } catch (error) {
      console.error('Query error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in GET /api/tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await initSupabase(request)
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