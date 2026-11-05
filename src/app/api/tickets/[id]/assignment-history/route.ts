import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function assigneeChange(value: unknown) {
  if (!value || typeof value !== 'object' || !('assignee_id' in value)) return null
  return value
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Create Supabase client with proper cookie handling
    const supabase = await createClient()

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
      return assigneeChange(entry.changes) !== null
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
      const changes = assigneeChange(entry.changes)
      if (typeof changes?.assignee_id === 'string') agentIds.add(changes.assignee_id)
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
      const assigneeId = assigneeChange(entry.changes)?.assignee_id
      const assignee = typeof assigneeId === 'string' ? agentMap.get(assigneeId) : undefined

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