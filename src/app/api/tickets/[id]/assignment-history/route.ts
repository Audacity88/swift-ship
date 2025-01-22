import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createClient = async (request: Request) => {
  const cookieStore = cookies()
  
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

// GET /api/tickets/[id]/assignment-history
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First get all assignment changes from audit logs
    const { data: history, error: historyError } = await supabase
      .from('audit_logs')
      .select('id, created_at, changes, actor_id')
      .eq('entity_type', 'ticket')
      .eq('entity_id', params.id)
      .eq('action', 'update')
      .not('changes->assigneeId', 'is', null)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Failed to fetch assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    // Get all unique agent IDs from both actor_id and assigneeId
    const actorIds = new Set(history.map(entry => entry.actor_id))
    const assigneeIds = new Set(history.map(entry => entry.changes.assigneeId))
    const allAgentIds = [...new Set([...actorIds, ...assigneeIds])]

    // Fetch agent details in a single query
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, avatar')
      .in('id', allAgentIds)

    if (agentsError) {
      console.error('Failed to fetch agent details:', agentsError)
      return NextResponse.json(
        { error: 'Failed to fetch agent details' },
        { status: 500 }
      )
    }

    // Create a map of agent details for easy lookup
    const agentMap = new Map(agents?.map(agent => [agent.id, agent]))

    // Transform the data to match the frontend's expected format
    const transformedHistory = history.map(entry => {
      const actor = agentMap.get(entry.actor_id)
      const assignedAgent = agentMap.get(entry.changes.assigneeId)

      return {
        id: entry.id,
        agent: {
          name: assignedAgent?.name || 'Unknown',
          avatar: assignedAgent?.avatar
        },
        assignedBy: {
          name: actor?.name || 'Unknown'
        },
        assignedAt: entry.created_at
      }
    })

    return NextResponse.json(transformedHistory)
  } catch (error) {
    console.error('Error fetching assignment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignment history' },
      { status: 500 }
    )
  }
} 