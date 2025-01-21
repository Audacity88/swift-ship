import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, Transaction } from '@/lib/db'
import { auth } from '@/lib/auth'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

// GET /api/tickets - List tickets with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = new URL(request.url).searchParams
    const filters = ticketFiltersSchema.parse({
      status: searchParams.get('status')?.split(','),
      priority: searchParams.get('priority')?.split(','),
      search: searchParams.get('search'),
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    })

    const { page, pageSize } = paginationSchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize')
    })

    const { sortField, sortDirection } = sortingSchema.parse({
      sortField: searchParams.get('sortField'),
      sortDirection: searchParams.get('sortDirection')
    })

    // Convert camelCase to snake_case for sorting
    const dbSortField = sortField.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

    // Build query
    let query = supabase
      .from('tickets')
      .select('*, customer:customers(*), assignee:agents!tickets_assignee_id_fkey(*)', { count: 'exact' })

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.priority?.length) {
      query = query.in('priority', filters.priority)
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
    const { data: tickets, count, error } = await query
      .order(dbSortField, { ascending: sortDirection === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
      throw error
    }

    // Transform the response to match our frontend's expected structure
    const transformedTickets = tickets.map((ticket: any) => ({
      ...ticket,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      resolvedAt: ticket.resolved_at,
      customer: ticket.customer,
      assignee: ticket.assignee,
      tags: ticket.tags || []
    }))

    return NextResponse.json({
      data: transformedTickets,
      total: count || 0
    })
  } catch (error) {
    console.error('Failed to fetch tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
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

    if (ticketError) throw ticketError

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
      if (tagsError) throw tagsError
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: ticket.id,
        action: 'create',
        actor_id: session.id,
        actor_type: session.type,
        changes: {
          title: body.title,
          description: body.description,
          priority: body.priority,
          customerId: body.customerId,
          assigneeId: body.assigneeId,
          tags: body.tags
        }
      })

    if (auditError) throw auditError

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
      { error: 'Failed to create ticket', details: error },
      { status: 500 }
    )
  }
} 