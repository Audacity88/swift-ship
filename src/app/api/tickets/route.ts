import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import type { NextRequest } from 'next/server'
import { ticketService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'

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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignee = searchParams.get('assignee')
    const team = searchParams.get('team')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role, team_id')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'
    const isAgent = !!agent

    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(*),
        assignee:assignee_id(*),
        team:team_id(*),
        tags:ticket_tags(tag_id(*))
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (assignee) {
      query = query.eq('assignee_id', assignee)
    }
    if (team) {
      query = query.eq('team_id', team)
    }

    // Apply search filter
    if (search) {
      query = query.or(`
        title.ilike.%${search}%,
        description.ilike.%${search}%,
        reference.ilike.%${search}%
      `)
    }

    // Apply access control
    if (!isAdmin && !isAgent) {
      // Customers can only see their own tickets
      query = query.eq('customer_id', user.id)
    } else if (!isAdmin && agent?.team_id) {
      // Agents can see tickets assigned to them or their team
      query = query.or(`assignee_id.eq.${user.id},team_id.eq.${agent.team_id}`)
    }

    // Add pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    // Execute query
    const { data: tickets, count, error } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        page,
        limit
      }
    })
  } catch (error) {
    console.error('Error in GET /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ticket = await request.json()

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role, team_id')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'
    const isAgent = !!agent

    // Only agents and admins can create tickets for other customers
    if (!isAdmin && !isAgent && ticket.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Cannot create tickets for other customers' },
        { status: 403 }
      )
    }

    // Create ticket
    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert({
        ...ticket,
        created_by: user.id,
        updated_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json(newTicket)
  } catch (error) {
    console.error('Error in POST /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 