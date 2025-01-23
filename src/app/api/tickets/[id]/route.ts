import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { z } from 'zod'
import { Permission } from '@/types/role'
import { getUserRole, hasAnyPermission } from '@/lib/auth/permissions'

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
export async function PATCH(request: Request, context: { params: { id: string } }) {
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
    const updates = await request.json()

    // Check if user has permission to update this ticket
    const { data: agent } = await supabase
      .from('agents')
      .select('role, team_id')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'
    const isAgent = !!agent

    if (!isAdmin && !isAgent) {
      return NextResponse.json(
        { error: 'Unauthorized - Agent access required' },
        { status: 403 }
      )
    }

    // Get current ticket state
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    }

    // Check if agent has access to this ticket
    if (!isAdmin) {
      const isAssignedAgent = ticket.assignee_id === user.id
      const isTeamMember = agent?.team_id === ticket.team_id

      if (!isAssignedAgent && !isTeamMember) {
        return NextResponse.json(
          { error: 'Unauthorized - Not assigned to ticket' },
          { status: 403 }
        )
      }
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error in PATCH /api/tickets/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}