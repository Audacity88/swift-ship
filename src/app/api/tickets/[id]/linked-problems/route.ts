import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import type { Database } from '@/types/database.types'

// Create a Supabase client for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/tickets/[id]/linked-problems - Get all linked problem tickets
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Use server-side auth check
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ID from params
    const { id } = await context.params

    // Get linked problems for the ticket
    const { data: linkedProblems, error: linksError } = await supabase
      .from('ticket_relationships')
      .select(`
        related_ticket_id,
        relationship_type,
        related_ticket:tickets!related_ticket_id (
          id,
          title,
          status,
          priority,
          created_at,
          updated_at,
          metadata
        )
      `)
      .eq('ticket_id', id)
      .eq('relationship_type', 'problem')

    if (linksError) {
      console.error('Error fetching ticket links:', linksError)
      return NextResponse.json(
        { error: 'Failed to fetch linked problems' },
        { status: 500 }
      )
    }

    // Map the results to a cleaner format
    const problems = linkedProblems?.map(link => ({
      id: link.related_ticket.id,
      title: link.related_ticket.title,
      status: link.related_ticket.status,
      priority: link.related_ticket.priority,
      createdAt: link.related_ticket.created_at,
      updatedAt: link.related_ticket.updated_at,
      metadata: link.related_ticket.metadata
    })) || []

    return NextResponse.json(problems)
  } catch (error) {
    console.error('Error in GET /api/tickets/[id]/linked-problems:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/linked-problems - Link a problem ticket
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const ticketId = params.id
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { problemId } = await request.json()

    if (!problemId) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      )
    }

    // Verify the problem ticket exists and is of type 'problem'
    const { data: problemTicket, error: problemError } = await supabase
      .from('tickets')
      .select('id, type')
      .eq('id', problemId)
      .single()

    if (problemError || !problemTicket) {
      console.error('Problem ticket not found:', problemError)
      return NextResponse.json(
        { error: 'Problem ticket not found' },
        { status: 404 }
      )
    }

    if (problemTicket.type !== 'problem') {
      return NextResponse.json(
        { error: 'Referenced ticket is not a problem ticket' },
        { status: 400 }
      )
    }

    // Create the relationship
    const { error: relationshipError } = await supabase
      .from('ticket_relationships')
      .insert({
        ticket_id: ticketId,
        related_ticket_id: problemId,
        relationship_type: 'problem',
        created_by: session.id,
        metadata: {
          created_at: new Date().toISOString(),
          created_by_email: session.email
        }
      })

    if (relationshipError) {
      console.error('Failed to create ticket relationship:', relationshipError)
      return NextResponse.json(
        { error: 'Failed to link tickets' },
        { status: 500 }
      )
    }

    // Create an audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        ticket_id: ticketId,
        actor_id: session.id,
        action: 'link_problem',
        metadata: {
          problem_id: problemId,
          timestamp: new Date().toISOString()
        }
      })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't return error since the link was created successfully
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error linking tickets:', error)
    return NextResponse.json(
      { error: 'Failed to link tickets' },
      { status: 500 }
    )
  }
}

// DELETE /api/tickets/[id]/linked-problems - Unlink a problem ticket
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const ticketId = params.id
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { problemId } = await request.json()

    if (!problemId) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      )
    }

    // Delete the relationship
    const { error: unlinkError } = await supabase
      .from('ticket_relationships')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('related_ticket_id', problemId)
      .eq('relationship_type', 'problem')

    if (unlinkError) {
      console.error('Failed to delete ticket relationship:', unlinkError)
      return NextResponse.json(
        { error: 'Failed to unlink tickets' },
        { status: 500 }
      )
    }

    // Create an audit log entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        ticket_id: ticketId,
        actor_id: session.id,
        action: 'unlink_problem',
        metadata: {
          problem_id: problemId,
          timestamp: new Date().toISOString()
        }
      })

    if (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't return error since the unlink was successful
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking tickets:', error)
    return NextResponse.json(
      { error: 'Failed to unlink tickets' },
      { status: 500 }
    )
  }
} 