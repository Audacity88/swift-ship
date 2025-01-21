import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, Transaction } from '@/lib/db'
import { auth } from '@/lib/auth'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { createClient } from '@supabase/supabase-js'
import { Permission } from '@/types/role'
import { checkUserPermissions } from '@/lib/auth/check-permissions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types
interface TicketResult {
  id: string
  description: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  customer_id: string
  assignee_id: string | null
  metadata: Record<string, any>
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
    data: Record<string, any>
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
  { params }: { params: { id: string } }
) {
  try {
    // Get current ticket
    const [ticket] = await sql.execute<TicketResult>(sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.customer_id,
        t.assignee_id,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        t.metadata
      FROM tickets t
      WHERE t.id = ${params.id}
    `)

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this ticket
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TICKETS)
    if (permissionCheck.error) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status || 403 }
      )
    }

    // If user is a customer, they can only view their own tickets
    if (permissionCheck.user?.type === 'customer' && ticket.customer_id !== permissionCheck.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this ticket' },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: ticket })
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
    const body = updateTicketSchema.parse(json)

    // Start a transaction
    const result = await sql.transaction(async (tx: Transaction) => {
      // Get current ticket state
      const [currentTicket] = await tx.execute<TicketResult>(sql`
        SELECT * FROM tickets WHERE id = ${params.id}
      `)

      if (!currentTicket) {
        throw new Error('Ticket not found')
      }

      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (body.title !== undefined) {
        updates.push(`title = $${paramCount}`)
        values.push(body.title)
        paramCount++
      }
      if (body.description !== undefined) {
        updates.push(`description = $${paramCount}`)
        values.push(body.description)
        paramCount++
      }
      if (body.priority !== undefined) {
        updates.push(`priority = $${paramCount}`)
        values.push(body.priority)
        paramCount++
      }
      if (body.status !== undefined) {
        updates.push(`status = $${paramCount}`)
        values.push(body.status)
        paramCount++
        if (body.status === TicketStatus.RESOLVED) {
          updates.push(`resolved_at = NOW()`)
        }
      }
      if (body.assigneeId !== undefined) {
        updates.push(`assignee_id = $${paramCount}`)
        values.push(body.assigneeId)
        paramCount++
      }
      if (body.metadata !== undefined) {
        updates.push(`metadata = metadata || $${paramCount}::jsonb`)
        values.push(JSON.stringify(body.metadata))
        paramCount++
      }

      // Update ticket if there are changes
      if (updates.length > 0) {
        // Convert to parameterized query for sql template literal
        const updateQuery = sql`
          UPDATE tickets 
          SET ${sql.join(
            updates.map((update, i) => sql`${sql.__dangerous__rawValue(update)} = ${values[i]}`),
            ', '
          )}, updated_at = NOW()
          WHERE id = ${params.id}
          RETURNING *
        `
        
        const [ticket] = await tx.execute<TicketResult>(updateQuery)

        // Update tags if provided
        if (body.tags !== undefined) {
          await tx.execute(sql`
            DELETE FROM ticket_tags WHERE ticket_id = ${params.id}
          `)
          if (body.tags.length > 0) {
            await tx.execute(sql`
              INSERT INTO ticket_tags (ticket_id, tag_id)
              SELECT ${params.id}, tag_id
              FROM unnest(${body.tags}::uuid[]) AS tag_id
            `)
          }
        }

        // Create snapshot
        await tx.execute(sql`
          INSERT INTO ticket_snapshots (
            ticket_id,
            data,
            reason,
            triggered_by
          ) VALUES (
            ${params.id},
            ${JSON.stringify(ticket)}::jsonb,
            'Update',
            ${session.id}
          )
        `)

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
            'update',
            ${session.id},
            ${session.type},
            ${JSON.stringify(body)}::jsonb
          )
        `)

        return ticket
      }

      return currentTicket
    })

    return NextResponse.json({ data: result })
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

// DELETE /api/tickets/[id] - Archive a ticket
export async function DELETE(
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

    // Archive the ticket instead of deleting
    await sql.transaction(async (tx: Transaction) => {
      const [ticket] = await tx.execute<TicketResult>(sql`
        UPDATE tickets 
        SET 
          is_archived = true,
          metadata = metadata || jsonb_build_object(
            'archivedAt', NOW(),
            'archivedBy', ${session.id}
          )
        WHERE id = ${params.id}
        RETURNING *
      `)

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      // Create snapshot
      await tx.execute(sql`
        INSERT INTO ticket_snapshots (
          ticket_id,
          data,
          reason,
          triggered_by
        ) VALUES (
          ${params.id},
          ${JSON.stringify(ticket)}::jsonb,
          'Archive',
          ${session.id}
        )
      `)

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
          'archive',
          ${session.id},
          ${session.type},
          jsonb_build_object('archived', true)
        )
      `)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to archive ticket:', error)
    return NextResponse.json(
      { error: 'Failed to archive ticket' },
      { status: 500 }
    )
  }
} 