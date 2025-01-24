import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Validation schema for updating a ticket
const updateTicketSchema = z.object({
  status: z.string().optional(),
  created_by: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  assigneeId: z.string().uuid().optional()
})

// Initialize Supabase client with cookie handling
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
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
}

// GET /api/tickets/[id] - Get a single ticket
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Initialize Supabase with cookie handling
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get route params
    const { id } = await context.params

    // Get ticket with related data
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(*),
        assignee:assignee_id(*)
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

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this ticket
    if (user.type === 'agent' && user.role !== 'admin' && ticket.assignee_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this ticket' },
        { status: 403 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Failed to fetch ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Initialize Supabase with cookie handling
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get route params
    const { id } = await context.params

    const json = await request.json()
    const body = updateTicketSchema.parse(json)

    // Get current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError) {
      throw ticketError
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Update ticket
    const updates = {
      ...(body.status && { status: body.status }),
      ...(body.assigneeId && { assignee_id: body.assigneeId }),
      ...(body.metadata && { metadata: body.metadata }),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Get user role from agents table
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('id', user.id)
      .single()

    // Determine actor type based on whether user is an agent
    const actorType = agentData ? 'agent' : 'customer'

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: id,
        action: 'update',
        actor_id: user.id,
        actor_type: actorType,
        changes: {
          ...(body.status && { status: body.status }),
          ...(body.assigneeId && { assignee_id: body.assigneeId }),
          ...(body.metadata && { metadata: body.metadata })
        }
      })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't throw since the ticket was updated successfully
    }

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Failed to update ticket:', error)
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
