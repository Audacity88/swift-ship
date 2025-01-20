import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { TicketStatus } from '@/types/ticket'
import { DEFAULT_STATUS_WORKFLOW } from '@/types/status-workflow'

interface StatusTransitionRequest {
  status: TicketStatus
  reason?: string
}

interface StatusTransition {
  status: TicketStatus
  requiredRole?: string
  conditions?: {
    type: string
    message: string
  }[]
}

const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

const mockTransitions: Record<TicketStatus, StatusTransition[]> = {
  'open': [
    {
      status: 'in_progress',
      conditions: [
        {
          type: 'required_fields',
          message: 'Ticket must be assigned to an agent'
        }
      ]
    },
    {
      status: 'closed',
      conditions: [
        {
          type: 'resolution',
          message: 'Resolution must be provided'
        }
      ]
    }
  ],
  'in_progress': [
    {
      status: 'waiting',
      conditions: [
        {
          type: 'comment',
          message: 'A comment must be added explaining what we are waiting for'
        }
      ]
    },
    {
      status: 'resolved',
      conditions: [
        {
          type: 'resolution',
          message: 'Resolution must be provided'
        }
      ]
    }
  ],
  'waiting': [
    {
      status: 'in_progress'
    },
    {
      status: 'resolved',
      conditions: [
        {
          type: 'resolution',
          message: 'Resolution must be provided'
        }
      ]
    }
  ],
  'resolved': [
    {
      status: 'closed'
    },
    {
      status: 'in_progress',
      conditions: [
        {
          type: 'comment',
          message: 'A comment must be added explaining why the ticket is being reopened'
        }
      ]
    }
  ],
  'closed': [
    {
      status: 'in_progress',
      requiredRole: 'admin',
      conditions: [
        {
          type: 'comment',
          message: 'A comment must be added explaining why the ticket is being reopened'
        }
      ]
    }
  ]
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { status, reason }: StatusTransitionRequest = await request.json()

    // Get current ticket status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('status, assignee_id')
      .eq('id', params.id)
      .single()

    if (ticketError) throw ticketError
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    const transition = DEFAULT_STATUS_WORKFLOW.find(t => 
      t.from === ticket.status && t.to === status
    )

    if (!transition) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      )
    }

    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    if (agentError) throw agentError
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check role requirements
    if (transition.requiredRole && agent.role !== transition.requiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this transition' },
        { status: 403 }
      )
    }

    // Check conditions
    if (transition.conditions) {
      for (const condition of transition.conditions) {
        switch (condition.type) {
          case 'required_fields':
            if (condition.params.fieldIds?.includes('assignee') && !ticket.assignee_id) {
              return NextResponse.json(
                { error: 'Assignee is required for this transition' },
                { status: 400 }
              )
            }
            // Add other field validations as needed
            break

          case 'time_elapsed':
            if (condition.params.minTimeInStatus) {
              const { data: history } = await supabase
                .from('status_history')
                .select('created_at')
                .eq('ticket_id', params.id)
                .eq('to_status', ticket.status)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              if (history) {
                const elapsedMinutes = (Date.now() - new Date(history.created_at).getTime()) / (1000 * 60)
                if (elapsedMinutes < condition.params.minTimeInStatus) {
                  return NextResponse.json(
                    { error: 'Minimum time in current status not met' },
                    { status: 400 }
                  )
                }
              }
            }
            break

          // Add other condition types as needed
        }
      }
    }

    // Begin transaction
    const { error: transactionError } = await supabase.rpc('change_ticket_status', {
      p_ticket_id: params.id,
      p_new_status: status,
      p_changed_by: user.id,
      p_reason: reason || null,
      p_automation_triggered: false
    })

    if (transactionError) throw transactionError

    // Execute automation hooks
    if (transition.automationHooks) {
      for (const hook of transition.automationHooks) {
        switch (hook.type) {
          case 'notification':
            // TODO: Implement notification sending
            break

          case 'field_update':
            if (hook.params.fieldUpdates?.length) {
              const { error: updateError } = await supabase
                .from('ticket_custom_fields')
                .upsert(
                  hook.params.fieldUpdates.map(update => ({
                    ticket_id: params.id,
                    field_id: update.fieldId,
                    value: update.value
                  }))
                )

              if (updateError) throw updateError
            }
            break

          case 'sla_update':
            if (hook.params.slaAction) {
              const { error: slaError } = await supabase.rpc(
                `${hook.params.slaAction}_ticket_sla`,
                { p_ticket_id: params.id }
              )

              if (slaError) throw slaError
            }
            break

          case 'custom':
            if (hook.params.customAction) {
              await hook.params.customAction(params.id)
            }
            break
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to change ticket status:', error)
    return NextResponse.json(
      { error: 'Failed to change ticket status' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current ticket status
    // For now, just use mock data
    const currentStatus: TicketStatus = 'open'

    // Get available transitions
    const availableTransitions = mockTransitions[currentStatus] || []

    return NextResponse.json({ data: availableTransitions })
  } catch (error) {
    console.error('Failed to get available status transitions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 