import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, Transaction } from '@/lib/db'
import { auth } from '@/lib/auth'

// Types
interface MessageResult {
  id: string
  ticket_id: string
  content: string
  author_type: 'customer' | 'agent'
  author_id: string
  is_internal: boolean
  created_at: string
  updated_at: string
  author: {
    id: string
    name: string
    email: string
    avatar: string | null
    type: 'customer' | 'agent'
    role?: 'agent' | 'admin'
  }
}

// Validation schema for creating a comment
const createCommentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(false)
})

// POST /api/tickets/[id]/comments - Add a comment to a ticket
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = createCommentSchema.parse(json)

    // Start a transaction
    const result = await sql.transaction(async (tx: Transaction) => {
      // Verify ticket exists
      const [ticket] = await tx.execute(sql`
        SELECT id FROM tickets WHERE id = ${params.id}
      `)

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      // Create the message
      const [message] = await tx.execute<MessageResult>(sql`
        INSERT INTO messages (
          ticket_id,
          content,
          author_type,
          author_id,
          is_internal
        ) VALUES (
          ${params.id},
          ${body.content},
          ${session.type},
          ${session.id},
          ${body.isInternal}
        )
        RETURNING *
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
          'comment',
          ${session.id},
          ${session.type},
          ${JSON.stringify({
            messageId: message.id,
            content: body.content,
            isInternal: body.isInternal
          })}::jsonb
        )
      `)

      // Update ticket updated_at
      await tx.execute(sql`
        UPDATE tickets 
        SET updated_at = NOW()
        WHERE id = ${params.id}
      `)

      return message
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to create comment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

// GET /api/tickets/[id]/comments - Get comments for a ticket
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get comments with author details
    const comments = await sql.execute<MessageResult>(sql`
      SELECT 
        m.*,
        CASE m.author_type
          WHEN 'customer' THEN json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'avatar', c.avatar,
            'type', 'customer'
          )
          WHEN 'agent' THEN json_build_object(
            'id', a.id,
            'name', a.name,
            'email', a.email,
            'avatar', a.avatar,
            'role', a.role,
            'type', 'agent'
          )
        END as author
      FROM messages m
      LEFT JOIN customers c ON m.author_type = 'customer' AND m.author_id = c.id
      LEFT JOIN agents a ON m.author_type = 'agent' AND m.author_id = a.id
      WHERE m.ticket_id = ${params.id}
      ORDER BY m.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    // Get total count
    const [{ count }] = await sql.execute<{ count: string }>(sql`
      SELECT COUNT(*) 
      FROM messages 
      WHERE ticket_id = ${params.id}
    `)

    return NextResponse.json({
      data: comments,
      pagination: {
        total: parseInt(count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count) / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
} 