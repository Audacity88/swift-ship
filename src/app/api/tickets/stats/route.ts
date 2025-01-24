import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { sql } from '@/lib/db'
import { TicketPriority, TicketStatus } from '@/types/ticket'

interface TicketCount {
  type: 'priority' | 'status'
  key: string
  count: number
}

interface ResolutionTime {
  priority: string
  avg_hours: number
  min_hours: number
  max_hours: number
}

interface SLAStats {
  priority: string
  total: number
  response_breached: number
  resolution_breached: number
}

interface VolumeTrend {
  date: string
  created: number
  resolved: number
}

interface AgentMetrics {
  id: string
  name: string
  total_assigned: number
  total_resolved: number
  avg_resolution_hours: number
  sla_breaches: number
}

// GET /api/tickets/stats - Get ticket statistics
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    // Support both naming conventions
    const startDate = searchParams.get('startDate') || searchParams.get('from')
    const endDate = searchParams.get('endDate') || searchParams.get('to')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing date range parameters. Please provide either startDate/endDate or from/to parameters.' },
        { status: 400 }
      )
    }

    // Validate date formats
    try {
      new Date(startDate).toISOString()
      new Date(endDate).toISOString()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid date format. Please provide dates in ISO format.' },
        { status: 400 }
      )
    }

    // Get ticket counts
    const ticketCounts = await sql.execute(sql`
      SELECT 
        'status' as type,
        status::text as key,
        COUNT(*)::integer as count
      FROM tickets 
      WHERE created_at >= ${startDate}::timestamp
      AND created_at <= ${endDate}::timestamp
      GROUP BY status
      UNION ALL
      SELECT 
        'priority' as type,
        priority::text as key,
        COUNT(*)::integer as count
      FROM tickets 
      WHERE created_at >= ${startDate}::timestamp
      AND created_at <= ${endDate}::timestamp
      GROUP BY priority
    `, supabase)

    // Get resolution times
    const resolutionTimes = await sql.execute(sql`
      WITH resolution_history AS (
        SELECT DISTINCT ON (ticket_id)
          ticket_id,
          created_at as resolved_at
        FROM status_history
        WHERE to_status = 'resolved'
        ORDER BY ticket_id, created_at ASC
      )
      SELECT 
        t.priority::text as priority,
        ROUND(AVG(EXTRACT(EPOCH FROM (rh.resolved_at - t.created_at))/3600)::numeric, 2) as avg_hours,
        ROUND(MIN(EXTRACT(EPOCH FROM (rh.resolved_at - t.created_at))/3600)::numeric, 2) as min_hours,
        ROUND(MAX(EXTRACT(EPOCH FROM (rh.resolved_at - t.created_at))/3600)::numeric, 2) as max_hours
      FROM tickets t
      JOIN resolution_history rh ON t.id = rh.ticket_id
      WHERE t.created_at >= ${startDate}::timestamp
      AND t.created_at <= ${endDate}::timestamp
      GROUP BY t.priority
    `, supabase)

    // Get SLA stats
    const slaStats = await sql.execute(sql`
      WITH first_responses AS (
        SELECT DISTINCT ON (ticket_id)
          ticket_id,
          created_at as first_response_time
        FROM messages
        WHERE author_type = 'agent'
        ORDER BY ticket_id, created_at ASC
      )
      SELECT
        t.priority::text as priority,
        COUNT(*)::integer as total,
        COUNT(*) FILTER (
          WHERE fr.first_response_time > t.created_at + 
            CASE t.priority 
              WHEN 'urgent' THEN INTERVAL '1 hour'
              WHEN 'high' THEN INTERVAL '4 hours'
              WHEN 'medium' THEN INTERVAL '8 hours'
              ELSE INTERVAL '24 hours'
            END
        )::integer as response_breached,
        COUNT(*) FILTER (
          WHERE t.status = 'resolved' AND EXISTS (
            SELECT 1 FROM status_history sh 
            WHERE sh.ticket_id = t.id 
            AND sh.to_status = 'resolved'
            AND sh.created_at > t.created_at + 
              CASE t.priority
                WHEN 'urgent' THEN INTERVAL '4 hours'
                WHEN 'high' THEN INTERVAL '8 hours'
                WHEN 'medium' THEN INTERVAL '24 hours'
                ELSE INTERVAL '48 hours'
              END
          )
        )::integer as resolution_breached
      FROM tickets t
      LEFT JOIN first_responses fr ON t.id = fr.ticket_id
      WHERE t.created_at >= ${startDate}::timestamp
      AND t.created_at <= ${endDate}::timestamp
      GROUP BY t.priority
    `, supabase)

    // Get ticket volume trends
    const volumeTrends = await sql.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved
      FROM tickets
      WHERE created_at >= ${startDate}::timestamp
      AND created_at <= ${endDate}::timestamp
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at)
    `, supabase)

    // Get agent metrics
    const agentMetrics = await sql.execute(sql`
      WITH resolution_history AS (
        SELECT DISTINCT ON (ticket_id)
          ticket_id,
          created_at as resolved_at
        FROM status_history
        WHERE to_status = 'resolved'
        ORDER BY ticket_id, created_at ASC
      )
      SELECT 
        a.id::text as id,
        a.name::text as name,
        COUNT(t.id)::integer as total_assigned,
        COUNT(rh.resolved_at)::integer as total_resolved,
        ROUND(AVG(EXTRACT(EPOCH FROM (rh.resolved_at - t.created_at))/3600)::numeric, 2) as avg_resolution_hours,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM status_history sh 
            WHERE sh.ticket_id = t.id 
            AND sh.to_status = 'resolved'
            AND sh.created_at > t.created_at + 
              CASE t.priority
                WHEN 'urgent' THEN INTERVAL '4 hours'
                WHEN 'high' THEN INTERVAL '8 hours'
                WHEN 'medium' THEN INTERVAL '24 hours'
                ELSE INTERVAL '48 hours'
              END
          )
        )::integer as sla_breaches
      FROM agents a
      LEFT JOIN tickets t ON t.assignee_id = a.id
      LEFT JOIN resolution_history rh ON t.id = rh.ticket_id
      WHERE t.created_at >= ${startDate}::timestamp
      AND t.created_at <= ${endDate}::timestamp
      GROUP BY a.id, a.name
      ORDER BY a.name
    `, supabase)

    // Format the response to ensure consistent types
    return NextResponse.json({
      ticket_counts: ticketCounts || [],
      resolution_time: resolutionTimes || [],
      sla_stats: slaStats || [],
      volume_trends: volumeTrends || [],
      agent_metrics: agentMetrics || []
    }, {
      headers: {
        // Prevent date parsing issues by explicitly setting content type
        'content-type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('Error in GET /api/tickets/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 