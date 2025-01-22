import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const initSupabase = async () => {
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

// GET /api/tickets/[id]/linked-problems - Get all linked problem tickets
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id

    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, get the linked problem IDs
    const { data: links, error: linksError } = await supabase
      .from('ticket_links')
      .select('problem_id')
      .eq('ticket_id', ticketId)

    if (linksError) {
      console.error('Failed to fetch ticket links:', linksError)
      return NextResponse.json(
        { error: 'Failed to fetch linked tickets' },
        { status: 500 }
      )
    }

    if (!links?.length) {
      return NextResponse.json([])
    }

    // Then, get the problem tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        status,
        priority,
        created_at,
        type,
        customer:customers(*),
        assignee:agents!tickets_assignee_id_fkey(*)
      `)
      .in('id', links.map(link => link.problem_id))
      .eq('type', 'problem')

    if (ticketsError) {
      console.error('Failed to fetch problem tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch linked tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json(tickets || [])
  } catch (error) {
    console.error('Error fetching linked tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linked tickets' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/linked-problems - Link a problem ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
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
      .select('id')
      .eq('id', problemId)
      .eq('type', 'problem')
      .single()

    if (problemError || !problemTicket) {
      console.error('Problem ticket not found:', problemError)
      return NextResponse.json(
        { error: 'Problem ticket not found' },
        { status: 404 }
      )
    }

    // Create the link in the ticket_links table
    const { error: linkError } = await supabase
      .from('ticket_links')
      .insert({
        ticket_id: ticketId,
        problem_id: problemId,
        created_by: user.id
      })

    if (linkError) {
      console.error('Failed to create ticket link:', linkError)
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
        actor_id: user.id,
        action: 'link_problem',
        metadata: {
          problem_id: problemId
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
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const supabase = await initSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
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

    // Delete the link from the ticket_links table
    const { error: unlinkError } = await supabase
      .from('ticket_links')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('problem_id', problemId)

    if (unlinkError) {
      console.error('Failed to delete ticket link:', unlinkError)
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
        actor_id: user.id,
        action: 'unlink_problem',
        metadata: {
          problem_id: problemId
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