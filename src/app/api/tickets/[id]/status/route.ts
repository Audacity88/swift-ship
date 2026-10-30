import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STATUS_WORKFLOW, normalizeTicketStatus } from '@/types/status-workflow'
import { TicketStatus } from '@/types/ticket'

type Context = { params: Promise<{ id: string }> }
const inputSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting', 'awaiting_response', 'resolved', 'closed']),
  reason: z.string().max(5000).optional()
})

async function loadContext(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: agent } = await supabase.from('agents').select('id,role').eq('id', user.id).maybeSingle()
  if (!agent || !['admin', 'agent', 'supervisor'].includes(agent.role)) return { response: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) }
  const { data: ticket, error } = await supabase.from('tickets').select('id,status').eq('id', id).maybeSingle()
  if (error) return { response: NextResponse.json({ error: 'Could not load ticket' }, { status: 500 }) }
  if (!ticket) return { response: NextResponse.json({ error: 'Ticket not found' }, { status: 404 }) }
  return { supabase, agent, ticket }
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params
  const loaded = await loadContext(id)
  if (loaded.response) return loaded.response
  const current = normalizeTicketStatus(loaded.ticket.status)
  return NextResponse.json({ data: DEFAULT_STATUS_WORKFLOW.filter(item => item.fromStatus === current).map(item => ({ status: item.toStatus, conditions: [] })) })
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params
  const loaded = await loadContext(id)
  if (loaded.response) return loaded.response
  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
  const target = normalizeTicketStatus(parsed.data.status)
  const current = normalizeTicketStatus(loaded.ticket.status)
  if (target !== current && !DEFAULT_STATUS_WORKFLOW.some(item => item.fromStatus === current && item.toStatus === target as TicketStatus)) {
    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
  }
  const { error } = await loaded.supabase.rpc('execute_status_transition', {
    p_ticket_id: id, p_new_status: target, p_reason: parsed.data.reason?.trim() || null, p_agent_id: loaded.agent.id
  })
  if (error) return NextResponse.json({ error: 'Status could not be updated. Refresh the ticket and try again.' }, { status: 409 })
  const { data } = await loaded.supabase.from('tickets').select('*').eq('id', id).maybeSingle()
  return NextResponse.json({ data })
}
