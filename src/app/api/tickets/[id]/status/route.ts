import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { TicketStatus } from '@/types/ticket'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createClient = async (request: Request) => {
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

// Types
interface StatusTransition {
  fromStatus: TicketStatus
  toStatus: TicketStatus
  requiredRole: 'agent' | 'admin' | null
  conditions: Array<{
    type: 'required_field' | 'time_restriction' | 'permission'
    message: string
    data?: Record<string, any>
  }>
  metadata?: Record<string, any>
}

interface TicketStatusInfo {
  id: string
  status: TicketStatus
  assignee_id: string | null
  customer_id: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  resolved_at: string | null
}

// Status transition rules
const statusTransitions: Record<TicketStatus, StatusTransition[]> = {
  [TicketStatus.OPEN]: [
    {
      fromStatus: TicketStatus.OPEN,
      toStatus: TicketStatus.IN_PROGRESS,
      requiredRole: null,
      conditions: [
        {
          type: 'required_field',
          message: 'Ticket must be assigned to an agent',
          data: { field: 'assignee_id' }
        }
      ]
    },
    {
      fromStatus: TicketStatus.OPEN,
      toStatus: TicketStatus.AWAITING_RESPONSE,
      requiredRole: null,
      conditions: []
    }
  ],
  [TicketStatus.IN_PROGRESS]: [
    {
      fromStatus: TicketStatus.IN_PROGRESS,
      toStatus: TicketStatus.RESOLVED,
      requiredRole: null,
      conditions: [
        {
          type: 'required_field',
          message: 'Resolution comment is required',
          data: { field: 'resolution_comment' }
        }
      ]
    },
    {
      fromStatus: TicketStatus.IN_PROGRESS,
      toStatus: TicketStatus.AWAITING_RESPONSE,
      requiredRole: null,
      conditions: []
    },
    {
      fromStatus: TicketStatus.IN_PROGRESS,
      toStatus: TicketStatus.OPEN,
      requiredRole: null,
      conditions: []
    }
  ],
  [TicketStatus.AWAITING_RESPONSE]: [
    {
      fromStatus: TicketStatus.AWAITING_RESPONSE,
      toStatus: TicketStatus.IN_PROGRESS,
      requiredRole: null,
      conditions: []
    },
    {
      fromStatus: TicketStatus.AWAITING_RESPONSE,
      toStatus: TicketStatus.RESOLVED,
      requiredRole: null,
      conditions: [
        {
          type: 'required_field',
          message: 'Resolution comment is required',
          data: { field: 'resolution_comment' }
        }
      ]
    }
  ],
  [TicketStatus.RESOLVED]: [
    {
      fromStatus: TicketStatus.RESOLVED,
      toStatus: TicketStatus.CLOSED,
      requiredRole: null,
      conditions: [
        {
          type: 'time_restriction',
          message: 'Must be resolved for at least 24 hours',
          data: { hours: 24 }
        }
      ]
    },
    {
      fromStatus: TicketStatus.RESOLVED,
      toStatus: TicketStatus.IN_PROGRESS,
      requiredRole: null,
      conditions: []
    }
  ],
  [TicketStatus.CLOSED]: [
    {
      fromStatus: TicketStatus.CLOSED,
      toStatus: TicketStatus.IN_PROGRESS,
      requiredRole: 'admin',
      conditions: [
        {
          type: 'permission',
          message: 'Only admins can reopen closed tickets'
        }
      ]
    }
  ]
}

// Validation schema for status update
const updateStatusSchema = z.object({
  status: z.enum([
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.AWAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]),
  reason: z.string().optional(),
  comment: z.string().optional()
})

// GET /api/tickets/[id]/status - Get available status transitions
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await Promise.resolve((await context.params))
  
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient(request)

    // Get current ticket status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        status,
        assignee_id,
        customer_id,
        metadata,
        created_at,
        updated_at,
        resolved_at
      `)
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

    // Get available transitions
    const availableTransitions = statusTransitions[ticket.status as TicketStatus]
      .filter((transition: StatusTransition) => {
        // Filter by role if required
        if (transition.requiredRole && transition.requiredRole !== session.role) {
          return false
        }
        return true
      })
      .map((transition: StatusTransition) => ({
        status: transition.toStatus,
        conditions: transition.conditions.map((condition: StatusTransition['conditions'][0]) => {
          switch (condition.type) {
            case 'time_restriction':
              if (condition.data?.hours && ticket.resolved_at) {
                const hoursElapsed = (Date.now() - new Date(ticket.resolved_at).getTime()) / (1000 * 60 * 60)
                return {
                  ...condition,
                  isSatisfied: hoursElapsed >= condition.data.hours
                }
              }
              return { ...condition, isSatisfied: false }
            
            case 'required_field':
              if (condition.data?.field === 'assignee_id') {
                return {
                  ...condition,
                  isSatisfied: ticket.assignee_id !== null
                }
              }
              return { ...condition, isSatisfied: false }
            
            case 'permission':
              return {
                ...condition,
                isSatisfied: session.role === 'admin'
              }
            
            default:
              return { ...condition, isSatisfied: false }
          }
        })
      }))

    return NextResponse.json({ data: availableTransitions })
  } catch (error) {
    console.error('Failed to get status transitions:', error)
    return NextResponse.json(
      { error: 'Failed to get status transitions', details: error },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/status - Update ticket status
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await Promise.resolve((await context.params))
  
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient(request)
    const json = await request.json()
    const body = updateStatusSchema.parse(json)

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

    // Update ticket status
    const updates: any = {
      status: body.status,
      updated_at: new Date().toISOString()
    }

    // Set resolved_at if status is being changed to resolved
    if (body.status === TicketStatus.RESOLVED) {
      updates.resolved_at = new Date().toISOString()
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

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: id,
        action: 'status_update',
        actor_id: session.id,
        actor_type: session.type,
        changes: {
          status: body.status,
          reason: body.reason
        }
      })

    if (auditError) {
      throw auditError
    }

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Failed to update ticket status:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update ticket status', details: error },
      { status: 500 }
    )
  }
} 