import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import type { NextRequest } from 'next/server'
import { authService, ticketService } from '@/lib/services'

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

// GET /api/tickets - Get tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await authService.getSession({})
    if (!session?.user) {
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

    // Fetch tickets using the service
    const { data: tickets, total } = await ticketService.fetchTickets({}, {
      filters,
      pagination: { page, pageSize },
      sort: { field: sortField, direction: sortDirection }
    })

    return NextResponse.json({
      data: tickets,
      total,
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
    // Check authentication
    const session = await authService.getSession({})
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = createTicketSchema.parse(json)

    // Create the ticket using the service
    const ticket = await ticketService.createTicket({}, {
      title: body.title,
      description: body.description,
      priority: body.priority,
      customerId: body.customerId,
      assigneeId: body.assigneeId,
      tags: body.tags,
      metadata: body.metadata
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
} 