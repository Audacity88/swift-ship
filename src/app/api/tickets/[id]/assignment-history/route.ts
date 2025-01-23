import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ticket ID from params
    const { id } = await context.params

    // Get the Supabase client
    const supabase = getServerSupabase({})

    // Get assignment history from audit logs
    const { data: history, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        actor:actor_id (
          id,
          email,
          raw_user_meta_data->name
        ),
        changes,
        metadata
      `)
      .eq('entity_type', 'ticket')
      .eq('entity_id', id)
      .eq('action', 'update')
      .contains('changes', { assignee_id: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assignment history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    return NextResponse.json(history)
  } catch (error: any) {
    console.error('Error in GET /api/tickets/[id]/assignment-history:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 