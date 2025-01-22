import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AuditLogFilters, AuditLogSort } from '@/types/audit'

interface AuditLogRequest {
  filters?: AuditLogFilters
  sort?: AuditLogSort
  pagination?: {
    page: number
    per_page: number
  }
}

const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { filters = {}, sort = { field: 'created_at', direction: 'desc' }, pagination = { page: 1, per_page: 10 } }: AuditLogRequest = await request.json()

    // Build base query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.entity_type?.length) {
      query = query.in('entity_type', filters.entity_type)
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters.actor_type?.length) {
      query = query.in('actor_type', filters.actor_type)
    }

    if (filters.actor_id) {
      query = query.eq('actor_id', filters.actor_id)
    }

    if (filters.action?.length) {
      query = query.in('action', filters.action)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    if (filters.search) {
      query = query.or(`
        entity_type.ilike.%${filters.search}%,
        changes->>'old'.ilike.%${filters.search}%,
        changes->>'new'.ilike.%${filters.search}%
      `)
    }

    // Apply sorting
    switch (sort.field) {
      case 'created_at':
        query = query.order('created_at', {
          ascending: sort.direction === 'asc'
        })
        break
      case 'entity_type':
        query = query.order('entity_type', {
          ascending: sort.direction === 'asc'
        })
        break
      case 'action':
        query = query.order('action', {
          ascending: sort.direction === 'asc'
        })
        break
      case 'actor.name':
        // Sort by actor_type first, then actor_id since we can't sort on joined fields
        query = query.order('actor_type', {
          ascending: sort.direction === 'asc'
        }).order('actor_id', {
          ascending: sort.direction === 'asc'
        })
        break
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    // Execute query
    const { data: logs, error, count } = await query
    if (error) throw error

    // Fetch actor details in parallel for non-system actors
    const actorPromises = logs.map(async (log) => {
      if (log.actor_type === 'system') {
        return {
          ...log,
          actor: {
            id: log.actor_id,
            type: 'system',
            name: 'System',
            email: null
          }
        }
      }

      const table = log.actor_type === 'agent' ? 'agents' : 'customers'
      const { data: actor } = await supabase
        .from(table)
        .select('id, name, email, avatar')
        .eq('id', log.actor_id)
        .single()

      return {
        ...log,
        actor: {
          id: log.actor_id,
          type: log.actor_type,
          ...(actor || {})
        }
      }
    })

    const enrichedLogs = await Promise.all(actorPromises)

    return NextResponse.json({
      data: enrichedLogs,
      pagination: {
        page: pagination.page,
        per_page: pagination.per_page,
        total: count || 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

// Get audit log retention settings
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_audit_retention_days')

    if (error) throw error

    return NextResponse.json({
      retention_days: data
    })
  } catch (error) {
    console.error('Failed to get audit retention settings:', error)
    return NextResponse.json(
      { error: 'Failed to get audit retention settings' },
      { status: 500 }
    )
  }
}

// Update audit log retention settings
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { retention_days }: { retention_days: number } = await request.json()

    if (!retention_days || retention_days < 1) {
      return NextResponse.json(
        { error: 'Invalid retention period' },
        { status: 400 }
      )
    }

    const { error } = await supabase.rpc('set_audit_retention_days', {
      p_days: retention_days
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update audit retention settings:', error)
    return NextResponse.json(
      { error: 'Failed to update audit retention settings' },
      { status: 500 }
    )
  }
} 