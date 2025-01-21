import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, Transaction } from '@/lib/db'
import { auth } from '@/lib/auth'
import { TicketStatus } from '@/types/ticket'

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
      toStatus: TicketStatus.OPEN,
      requiredRole: null,
      conditions: []
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
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]),
  reason: z.string().optional(),
  comment: z.string().optional()
})

// GET /api/tickets/[id]/status - Get available status transitions
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current ticket status
    const [ticket] = await sql.execute<TicketStatusInfo>(sql`
      SELECT 
        id,
        status,
        assignee_id,
        customer_id,
        metadata,
        created_at,
        updated_at,
        resolved_at
      FROM tickets 
      WHERE id = ${params.id}
    `)

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get available transitions
    const availableTransitions = statusTransitions[ticket.status]
      .filter(transition => {
        // Filter by role if required
        if (transition.requiredRole && transition.requiredRole !== session.role) {
          return false
        }
        return true
      })
      .map(transition => ({
        status: transition.toStatus,
        conditions: transition.conditions.map(condition => {
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
      { error: 'Failed to get status transitions' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/status - Update ticket status
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = updateStatusSchema.parse(json)

    // Start a transaction
    const result = await sql.transaction(async (tx: Transaction) => {
      // Get current ticket state
      const [ticket] = await tx.execute<TicketStatusInfo>(sql`
        SELECT 
          id,
          status,
          assignee_id,
          customer_id,
          metadata,
          created_at,
          updated_at,
          resolved_at
        FROM tickets 
        WHERE id = ${params.id}
      `)

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      // Validate transition
      const transition = statusTransitions[ticket.status]?.find(
        t => t.toStatus === body.status
      )

      if (!transition) {
        throw new Error(`Invalid status transition from ${ticket.status} to ${body.status}`)
      }

      // Check role requirement
      if (transition.requiredRole && transition.requiredRole !== session.role) {
        throw new Error(`Only ${transition.requiredRole}s can perform this transition`)
      }

      // Validate conditions
      const failedConditions = transition.conditions.filter(condition => {
        switch (condition.type) {
          case 'time_restriction':
            if (condition.data?.hours && ticket.resolved_at) {
              const hoursElapsed = (Date.now() - new Date(ticket.resolved_at).getTime()) / (1000 * 60 * 60)
              return hoursElapsed < condition.data.hours
            }
            return true

          case 'required_field':
            if (condition.data?.field === 'assignee_id') {
              return ticket.assignee_id === null
            }
            if (condition.data?.field === 'resolution_comment') {
              return !body.comment
            }
            return true

          case 'permission':
            return session.role !== 'admin'

          default:
            return true
        }
      })

      if (failedConditions.length > 0) {
        throw new Error(
          `Cannot transition status: ${failedConditions.map(c => c.message).join(', ')}`
        )
      }

      // Update ticket status
      const [updatedTicket] = await tx.execute<TicketStatusInfo>(sql`
        UPDATE tickets 
        SET 
          status = ${body.status},
          resolved_at = CASE 
            WHEN ${body.status} = 'resolved' THEN NOW()
            ELSE resolved_at
          END,
          updated_at = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `)

      // Create status history entry
      await tx.execute(sql`
        INSERT INTO status_history (
          ticket_id,
          from_status,
          to_status,
          changed_by,
          reason
        ) VALUES (
          ${params.id},
          ${ticket.status},
          ${body.status},
          ${session.id},
          ${body.reason || null}
        )
      `)

      // Add comment if provided
      if (body.comment) {
        await tx.execute(sql`
          INSERT INTO messages (
            ticket_id,
            content,
            author_type,
            author_id,
            is_internal
          ) VALUES (
            ${params.id},
            ${body.comment},
            ${session.type},
            ${session.id},
            false
          )
        `)
      }

      // Create audit log
      await tx.execute(sql`
        INSERT INTO audit_logs (
          entity_type,
          entity_id,
          action,
          actor_id,
          actor_type,
          changes
        ) VALUES (
          'ticket',
          ${params.id},
          'status_change',
          ${session.id},
          ${session.type},
          ${JSON.stringify({
            from: ticket.status,
            to: body.status,
            reason: body.reason,
            comment: body.comment
          })}::jsonb
        )
      `)

      return updatedTicket
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to update ticket status:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ticket status' },
      { status: 500 }
    )
  }
} 