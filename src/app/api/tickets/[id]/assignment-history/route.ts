import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Handle cookie setting error silently
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Handle cookie removal error silently
          }
        },
      },
    }
  )
}

// GET /api/tickets/[id]/assignment-history
export async function GET(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
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
      .select(`
        id,
        action,
        changes,
        created_at,
        performed_by,
        agents!performed_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('entity_type', 'ticket')
      .eq('entity_id', params.id)
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

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error in GET /api/tickets/[id]/assignment-history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 