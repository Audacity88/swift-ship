import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getRouteSupabase } from '@/lib/supabase-server'

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
    const supabase = await getRouteSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    const body = createCommentSchema.parse(json)

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', params.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Auth users do not carry the application's persisted agent classification.
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (agentError) {
      return NextResponse.json({ error: 'Failed to resolve comment author' }, { status: 500 })
    }
    const authorType = agent ? 'agent' : 'customer'
    if (body.isInternal && !agent) {
      return NextResponse.json({ error: 'Agent access required for internal notes' }, { status: 403 })
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: params.id,
        content: body.content,
        author_type: authorType,
        author_id: user.id,
        is_internal: body.isInternal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: params.id,
        action: 'comment',
        actor_id: user.id,
        actor_type: authorType,
        changes: {
          messageId: message.id,
          content: body.content,
          isInternal: body.isInternal
        }
      })

    if (auditError) {
      console.error('Error creating audit log:', auditError)
      // Don't fail if audit log fails
    }

    // Update ticket updated_at
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      // Don't fail if update fails
    }

    return NextResponse.json({ data: message })
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
    const supabase = await getRouteSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isSafeInteger(page * limit)) {
      return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 })
    }
    const offset = (page - 1) * limit

    const { data: comments, count, error: commentsError } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (commentsError) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }
    const total = count ?? 0

    return NextResponse.json({
      data: comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
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