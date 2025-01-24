import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Create Supabase client with proper cookie handling
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              cookieStore.set(name, value, { ...options })
            } catch (error) {
              // Handle cookie setting error silently
            }
          },
          remove(name: string, options: Record<string, unknown>) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              // Handle cookie removal error silently
            }
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.log('Auth error:', sessionError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ticket ID from params
    const { id } = await context.params
    console.log('Fetching history for ticket:', id)

    // First get all assignment changes from audit logs
    const { data: history, error: historyError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        actor_id,
        actor_type,
        changes
      `)
      .or('entity_type.eq.ticket,entity_type.eq.tickets')
      .eq('entity_id', id)
      .or('action.eq.update,action.eq.create')
      .not('changes', 'is', null)
      .order('created_at', { ascending: false })

    // Filter logs that have assignee_id changes
    const assignmentHistory = history?.filter(entry => {
      const changes = entry.changes as Record<string, any>
      return changes && 'assignee_id' in changes
    })

    if (historyError) {
      console.error('Error fetching assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    if (!assignmentHistory?.length) {
      console.log('No assignment history found')
      return NextResponse.json([])
    }

    // Get all unique agent IDs (both actors and assignees)
    const agentIds = new Set<string>()
    assignmentHistory.forEach(entry => {
      if (entry.actor_id) agentIds.add(entry.actor_id)
      const changes = entry.changes as Record<string, any>
      if (changes.assignee_id) agentIds.add(changes.assignee_id)
    })

    // Get all agent details in a single query
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, avatar')
      .in('id', Array.from(agentIds))

    if (agentsError) {
      console.error('Error fetching agent details:', agentsError)
      return NextResponse.json(
        { error: 'Failed to fetch agent details' },
        { status: 500 }
      )
    }

    // Create a map of agent details for quick lookup
    const agentMap = new Map(agents?.map(agent => [agent.id, agent]))

    // Format the history data to match UI expectations
    const formattedHistory = assignmentHistory?.map(entry => {
      const actor = agentMap.get(entry.actor_id)
      const assigneeId = (entry.changes as Record<string, any>).assignee_id
      const assignee = agentMap.get(assigneeId)

      return {
        id: entry.id,
        agent: {
          name: assignee?.name || 'System',
          avatar: assignee?.avatar || null
        },
        assignedBy: {
          name: actor?.name || 'System'
        },
        assignedAt: entry.created_at
      }
    })

    return NextResponse.json(formattedHistory || [])

  } catch (error) {
    console.error('Error in assignment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 