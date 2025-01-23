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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ticket ID from params
    const { id } = await context.params

    // First get all assignment changes from audit logs
    const { data: history, error: historyError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        actor_id,
        changes
      `)
      .eq('entity_type', 'ticket')
      .eq('entity_id', id)
      .eq('action', 'update')
      .contains('changes', { assignee_id: true })
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    // Get all unique agent IDs (both actors and assignees)
    const agentIds = new Set<string>()
    history?.forEach(entry => {
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
      console.error('Error fetching agents:', agentsError)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    // Create a map for quick agent lookups
    const agentMap = new Map(agents?.map(agent => [agent.id, agent]))

    // Transform the data to match the expected format
    const formattedHistory = history?.map(entry => {
      const changes = entry.changes as Record<string, any>
      const assignee = agentMap.get(changes.assignee_id)
      const actor = agentMap.get(entry.actor_id)
      
      return {
        id: entry.id,
        agent: {
          name: assignee?.name || 'Unknown',
          avatar: assignee?.avatar
        },
        assignedBy: {
          name: actor?.name || 'Unknown'
        },
        assignedAt: entry.created_at
      }
    })

    return NextResponse.json(formattedHistory)
  } catch (error: any) {
    console.error('Error in GET /api/tickets/[id]/assignment-history:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 