import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// SLA configuration (could be moved to database or config file)
const SLA_CONFIG = {
  response_time: {
    low: 24, // hours
    medium: 12,
    high: 4,
    urgent: 1
  },
  resolution_time: {
    low: 120, // hours
    medium: 72,
    high: 24,
    urgent: 8
  }
}

// Validation schema for pausing SLA
const pauseSLASchema = z.object({
  reason: z.string().min(1),
  resumeAt: z.string().datetime().optional()
})

// GET /api/tickets/[id]/sla - Get SLA status
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Get ticket and SLA state
    const [result] = await sql.execute(sql`
      SELECT 
        t.priority,
        t.status,
        t.created_at,
        t.resolved_at,
        s.started_at,
        s.paused_at,
        s.breached_at,
        s.response_breached,
        s.resolution_breached,
        s.total_paused_time,
        s.last_escalation_at,
        s.last_escalation_threshold
      FROM tickets t
      LEFT JOIN sla_states s ON t.id = s.ticket_id
      WHERE t.id = ${params.id}
    `)

    if (!result) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Calculate SLA metrics
    const now = new Date()
    const createdAt = new Date(result.created_at)
    const startedAt = result.started_at ? new Date(result.started_at) : createdAt
    const pausedAt = result.paused_at ? new Date(result.paused_at) : null
    const resolvedAt = result.resolved_at ? new Date(result.resolved_at) : null
    const totalPausedTime = result.total_paused_time || 0 // in minutes

    // Calculate elapsed time excluding paused time
    const elapsedMinutes = (() => {
      const end = resolvedAt || (pausedAt || now)
      const elapsed = (end.getTime() - startedAt.getTime()) / (1000 * 60)
      return Math.max(0, elapsed - totalPausedTime)
    })()

    // Get SLA targets for the ticket's priority
    const responseTarget = SLA_CONFIG.response_time[result.priority] * 60 // convert to minutes
    const resolutionTarget = SLA_CONFIG.resolution_time[result.priority] * 60

    // Calculate progress percentages
    const responseProgress = Math.min(100, (elapsedMinutes / responseTarget) * 100)
    const resolutionProgress = Math.min(100, (elapsedMinutes / resolutionTarget) * 100)

    // Calculate time remaining
    const getTimeRemaining = (target: number) => {
      const remaining = target - elapsedMinutes
      return remaining > 0 ? remaining : 0
    }

    const slaStatus = {
      name: `${result.priority.toUpperCase()} Priority SLA`,
      isBreached: result.response_breached || result.resolution_breached,
      isPaused: !!pausedAt,
      isCompleted: !!resolvedAt,
      response: {
        target: responseTarget,
        progress: responseProgress,
        remaining: getTimeRemaining(responseTarget),
        breached: result.response_breached
      },
      resolution: {
        target: resolutionTarget,
        progress: resolutionProgress,
        remaining: getTimeRemaining(resolutionTarget),
        breached: result.resolution_breached
      },
      metrics: {
        elapsedTime: elapsedMinutes,
        totalPausedTime,
        startedAt: startedAt.toISOString(),
        pausedAt: pausedAt?.toISOString(),
        breachedAt: result.breached_at,
        lastEscalation: {
          at: result.last_escalation_at,
          threshold: result.last_escalation_threshold
        }
      }
    }

    return NextResponse.json({ data: slaStatus })
  } catch (error) {
    console.error('Failed to get SLA status:', error)
    return NextResponse.json(
      { error: 'Failed to get SLA status' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/sla/pause - Pause SLA timer
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const json = await request.json()
    const body = pauseSLASchema.parse(json)

    // Start a transaction
    const result = await sql.transaction(async (tx) => {
      // Get current SLA state
      const [slaState] = await tx.execute(sql`
        SELECT 
          started_at,
          paused_at,
          total_paused_time
        FROM sla_states
        WHERE ticket_id = ${params.id}
      `)

      if (!slaState) {
        throw new Error('No SLA state found for ticket')
      }

      if (slaState.paused_at) {
        throw new Error('SLA is already paused')
      }

      // Pause the SLA
      const [updatedState] = await tx.execute(sql`
        UPDATE sla_states
        SET 
          paused_at = NOW(),
          updated_at = NOW()
        WHERE ticket_id = ${params.id}
        RETURNING *
      `)

      // Create audit log
      await tx.execute(sql`
        INSERT INTO audit_logs (
          entity_type,
          entity_id,
          action,
          actor_id,
          actor_type,
          changes
        ) VALUES (
          'ticket',
          ${params.id},
          'sla_pause',
          ${session.user.id},
          'agent',
          ${JSON.stringify({
            reason: body.reason,
            resumeAt: body.resumeAt
          })}::jsonb
        )
      `)

      return updatedState
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to pause SLA:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause SLA' },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/sla/resume - Resume SLA timer
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start a transaction
    const result = await sql.transaction(async (tx) => {
      // Get current SLA state
      const [slaState] = await tx.execute(sql`
        SELECT 
          started_at,
          paused_at,
          total_paused_time
        FROM sla_states
        WHERE ticket_id = ${params.id}
      `)

      if (!slaState) {
        throw new Error('No SLA state found for ticket')
      }

      if (!slaState.paused_at) {
        throw new Error('SLA is not paused')
      }

      // Calculate additional paused time
      const pausedAt = new Date(slaState.paused_at)
      const additionalPausedTime = (Date.now() - pausedAt.getTime()) / (1000 * 60)

      // Resume the SLA
      const [updatedState] = await tx.execute(sql`
        UPDATE sla_states
        SET 
          paused_at = NULL,
          total_paused_time = total_paused_time + ${Math.floor(additionalPausedTime)},
          updated_at = NOW()
        WHERE ticket_id = ${params.id}
        RETURNING *
      `)

      // Create audit log
      await tx.execute(sql`
        INSERT INTO audit_logs (
          entity_type,
          entity_id,
          action,
          actor_id,
          actor_type,
          changes
        ) VALUES (
          'ticket',
          ${params.id},
          'sla_resume',
          ${session.user.id},
          'agent',
          ${JSON.stringify({
            pausedTime: Math.floor(additionalPausedTime)
          })}::jsonb
        )
      `)

      return updatedState
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to resume SLA:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume SLA' },
      { status: 500 }
    )
  }
} 