import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type Context = { params: Promise<{ id: string }> }
const targets: Record<string, { response: number; resolution: number }> = {
  urgent: { response: 60, resolution: 480 }, high: { response: 240, resolution: 1440 },
  medium: { response: 720, resolution: 4320 }, low: { response: 1440, resolution: 7200 },
}
const pauseSchema = z.object({ reason: z.string().trim().min(1), resumeAt: z.string().datetime().optional() })

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ticket, error } = await supabase.from('tickets').select('priority,status,created_at,resolved_at').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load ticket' }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  const { data: state, error: stateError } = await supabase.from('sla_states').select('*').eq('ticket_id', id).maybeSingle()
  if (stateError) return NextResponse.json({ error: 'Unable to load SLA state' }, { status: 500 })
  const startedAt = state?.started_at || ticket.created_at
  const end = ticket.resolved_at || state?.paused_at || new Date().toISOString()
  const elapsed = Math.max(0, (Date.parse(end) - Date.parse(startedAt)) / 60000 - (state?.total_paused_time || 0))
  const target = targets[ticket.priority] || targets.medium
  const metric = (minutes: number, breached: boolean) => ({ target: minutes, progress: Math.min(100, elapsed / minutes * 100), remaining: Math.max(0, minutes - elapsed), breached })
  return NextResponse.json({ data: {
    name: `${ticket.priority.toUpperCase()} Priority SLA`,
    isBreached: !!(state?.response_breached || state?.resolution_breached),
    isPaused: !!state?.paused_at, isCompleted: !!ticket.resolved_at,
    response: metric(target.response, state?.response_breached || false),
    resolution: metric(target.resolution, state?.resolution_breached || false),
    metrics: { elapsedTime: elapsed, totalPausedTime: state?.total_paused_time || 0, startedAt,
      pausedAt: state?.paused_at, breachedAt: state?.breached_at,
      lastEscalation: { at: state?.last_escalation_at, threshold: state?.last_escalation_threshold } },
  } })
}

async function changePause(request: Request, { params }: Context, pause: boolean) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: agent } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
  if (!agent || !['admin', 'agent'].includes(agent.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (pause) {
    const parsed = pauseSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'A pause reason is required.' }, { status: 400 })
  }
  const { data: state, error } = await supabase.from('sla_states').select('*').eq('ticket_id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load SLA state' }, { status: 500 })
  if (!state) return NextResponse.json({ error: 'No SLA state found for ticket' }, { status: 404 })
  if (pause === Boolean(state.paused_at)) return NextResponse.json({ error: pause ? 'SLA is already paused' : 'SLA is not paused' }, { status: 409 })
  let query = supabase.from('sla_states').update({
    paused_at: pause ? new Date().toISOString() : null,
    total_paused_time: pause ? state.total_paused_time : state.total_paused_time + Math.max(0, Math.floor((Date.now() - Date.parse(state.paused_at)) / 60000)),
  }).eq('ticket_id', id)
  // Compare-and-set prevents concurrent resumes from counting pause time twice.
  query = pause ? query.is('paused_at', null) : query.eq('paused_at', state.paused_at)
  const { data: updated, error: updateError } = await query.select().maybeSingle()
  if (updateError) return NextResponse.json({ error: 'Unable to update SLA state' }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'SLA changed. Refresh and try again.' }, { status: 409 })
  return NextResponse.json({ data: updated })
}
export async function POST(request: Request, context: Context) { return changePause(request, context, true) }
export async function PUT(request: Request, context: Context) { return changePause(request, context, false) }
