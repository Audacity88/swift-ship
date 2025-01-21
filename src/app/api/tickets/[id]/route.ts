import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, Transaction } from '@/lib/db'
import { auth } from '@/lib/auth'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Permission } from '@/types/role'
import { hasAnyPermission, getUserRole } from '@/lib/auth/permissions'
import { RoleType } from '@/types/role'

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
  context: { params: { id: string } }
) {
  const { id } = await Promise.resolve(context.params)
  
  console.log('API route hit:', { 
    url: request.url,
    method: request.method,
    id
  })
  
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No Bearer token found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('Authenticated as:', user.id)

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
        isInternal: false, // Add default value
        user: {
          name: 'Unknown', // We'll need to fetch this from customers/agents
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
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient(request)
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
          SET ${sql.__dangerous__rawValue(updates.join(', '))}, updated_at = NOW()
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
              FROM unnest(${sql.__dangerous__rawValue('{' + body.tags.join(',') + '}')}::uuid[]) AS tag_id
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
    const supabase = await createClient(request)
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