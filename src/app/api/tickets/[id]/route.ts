import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { z } from 'zod'
import { Permission } from '@/types/role'
import { getUserRole, hasAnyPermission } from '@/lib/auth/permissions'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Types
interface TicketResult {
  id: string
  description: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  customer_id: string
  assignee_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  resolved_at: string | null
  is_archived: boolean
  customerName: string
  customerEmail: string
  customerAvatar: string | null
  customerCompany: string | null
  assigneeName: string | null
  assigneeEmail: string | null
  assigneeAvatar: string | null
  assigneeRole: 'agent' | 'admin' | null
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  messages: Array<{
    id: string
    content: string
    authorType: 'customer' | 'agent'
    authorId: string
    createdAt: string
    updatedAt: string
  }>
  snapshots: Array<{
    id: string
    snapshotAt: string
    data: Record<string, unknown>
    reason: string | null
    triggeredBy: string
  }>
}

// Validation schema for updating a ticket
const updateTicketSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.URGENT
  ]).optional(),
  status: z.enum([
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.AWAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional()
})

// GET /api/tickets/[id] - Get a single ticket
export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = context.params

    // Get ticket with all related data
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(*),
        assignee:assignee_id(*),
        team:team_id(*),
        comments:ticket_comments(*),
        attachments:ticket_attachments(*),
        custom_fields:ticket_custom_fields(*),
        tags:ticket_tags(tag_id(*))
      `)
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    }

    // Check if user has access to this ticket
    const { data: agent } = await supabase
      .from('agents')
      .select('role, team_id')
      .eq('id', user.id)
      .single()

    const isCustomer = !agent
    const isAdmin = agent?.role === 'admin'
    const isAssignedAgent = ticket.assignee_id === user.id
    const isTeamMember = agent?.team_id === ticket.team_id
    const isTicketCustomer = ticket.customer_id === user.id

    if (!isAdmin && !isAssignedAgent && !isTeamMember && !isTicketCustomer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error in GET /api/tickets/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Create Supabase client with proper cookie handling
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              cookieStore.set(name, value, { ...options })
            } catch (error) {
              // Handle cookie setting error silently
            }
          },
          remove(name: string, options: Record<string, unknown>) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              // Handle cookie removal error silently
            }
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (sessionError || !session || userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ticket ID from params (properly awaited)
    const { id } = await context.params

    // Log the ticket ID for debugging
    console.log('Processing ticket update:', { ticketId: id })

    // Get the update data from request body
    const body = await request.json()
    const { assigneeId } = body

    if (!assigneeId) {
      return NextResponse.json(
        { error: 'Assignee ID is required' },
        { status: 400 }
      )
    }

    // Verify the assignee exists and is an agent
    const { data: assignee, error: assigneeError } = await supabase
      .from('agents')
      .select('id, role')
      .eq('id', assigneeId)
      .single()

    if (assigneeError || !assignee) {
      console.error('Invalid assignee:', { error: assigneeError, assigneeId })
      return NextResponse.json(
        { error: 'Invalid assignee - must be an active agent' },
        { status: 400 }
      )
    }

    // Verify the ticket exists and user has permission to update it
    const { data: existingTicket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, assignee_id')
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', { error: ticketError, ticketId: id })
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    }

    if (!existingTicket) {
      console.error('Ticket not found:', { ticketId: id })
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to update the ticket
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'
    const isAssignedAgent = existingTicket.assignee_id === user.id

    if (!isAdmin && !isAssignedAgent) {
      return NextResponse.json(
        { error: 'You do not have permission to update this ticket' },
        { status: 403 }
      )
    }

    // Update the ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        assignee_id: assigneeId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, assignee:assignee_id(*)')  // Get assignee details in the response
      .single()

    if (updateError) {
      console.error('Error updating ticket:', { error: updateError, ticketId: id })
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    console.log('Ticket updated successfully:', { 
      ticketId: id, 
      assigneeId,
      ticket 
    })

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: id,
        action: 'update',
        actor_id: user.id,
        actor_type: 'agent',
        changes: {
          assignee_id: assigneeId
        },
        created_at: new Date().toISOString()
      })

    if (auditError) {
      console.error('Error creating audit log:', { error: auditError, ticketId: id })
      // Don't return error as the ticket was updated successfully
    }

    return NextResponse.json(ticket)
  } catch (error: any) {
    console.error('Error in PATCH /api/tickets/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}