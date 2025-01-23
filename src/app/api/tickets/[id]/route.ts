import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { z } from 'zod'
import { Permission } from '@/types/role'
import { getUserRole, hasAnyPermission } from '@/lib/auth/permissions'

const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Handle cookie setting error silently
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Handle cookie removal error silently
          }
        },
      },
    }
  )
}

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
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await Promise.resolve((await context.params))
  
  console.log('API route hit:', { 
    url: request.url,
    method: request.method,
    id
  })
  
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('Auth error:', sessionError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('Authenticated as:', session.user.id)

    // Get current ticket using Supabase query builder
    console.log('Fetching ticket:', id)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          avatar,
          company
        ),
        assignee:agents!tickets_assignee_id_fkey(
          id,
          name,
          email,
          avatar,
          role
        ),
        tags:ticket_tags(
          tag:tags(
            id,
            name,
            color
          )
        ),
        messages(
          id,
          content,
          author_type,
          author_id,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket: ' + ticketError.message },
        { status: 500 }
      )
    }

    if (!ticket) {
      console.error('Ticket not found:', id)
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Transform the response to match our frontend's expected structure
    const transformedTicket = {
      ...ticket,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      resolvedAt: ticket.resolved_at,
      customer: ticket.customer,
      assignee: ticket.assignee,
      comments: ticket.messages?.map((message: { 
        id: string; 
        content: string; 
        created_at: string; 
        updated_at: string;
      }) => ({
        id: message.id,
        content: message.content,
        isInternal: false,
        user: {
          name: 'Unknown',
          email: 'unknown@example.com'
        },
        createdAt: message.created_at,
        updatedAt: message.updated_at
      })) || [],
      tags: ticket.tags?.map((t: { tag: { id: string; name: string; color: string } }) => t.tag) || []
    }

    console.log('Ticket found, returning transformed data')
    return NextResponse.json({ data: transformedTicket })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = updateTicketSchema.parse(json)

    // Get current ticket state
    const { data: currentTicket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (ticketError) {
      return NextResponse.json(
        { error: 'Failed to fetch current ticket state' },
        { status: 500 }
      )
    }

    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to update tickets
    const userRole = await getUserRole(session.user.id)
    if (!hasAnyPermission(userRole, [Permission.UPDATE_TICKETS])) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (body.title) updateData.title = body.title
    if (body.description) updateData.description = body.description
    if (body.priority) updateData.priority = body.priority
    if (body.status) updateData.status = body.status
    if (body.assigneeId !== undefined) updateData.assignee_id = body.assigneeId
    if (body.metadata) updateData.metadata = body.metadata

    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update ticket: ' + updateError.message },
        { status: 500 }
      )
    }

    // Create audit log for the update
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: params.id,
        action: 'update',
        changes: body,
        actor_id: session.user.id,
        actor_type: 'agent'
      })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Error updating ticket:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}