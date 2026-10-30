import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { DEFAULT_SLA_CONFIGS, type SLAState } from '@/types/sla'
import { TicketPriority } from '@/types/ticket'

interface SLAPause {
  id: string
  ticket_id: string
  reason: string
  created_at: string
  resumed_at: string | null
}
interface SLASettings {
  id: string
  name: string
  first_response_time: number
  resolution_time: number
}
export interface TicketSLAState extends SLAState {
  config: SLASettings
  name: string
  isPaused: boolean
  isBreached: boolean
  isCompleted: boolean
  elapsedTime: number
  remainingTime: number
  breachTime: Date
  pauses: SLAPause[]
}

async function getStaff(context: ServerContext) {
  const supabase = getServerSupabase(context)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const { data: agent, error: roleError } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
  if (roleError) throw roleError
  if (!agent || !['admin', 'agent', 'supervisor'].includes(agent.role)) throw new Error('Staff access required')
  return { supabase, user }
}

export const slaService = {
  async getTicketSLA(context: ServerContext, ticketId: string): Promise<TicketSLAState | null> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')
    const { data: ticket, error } = await supabase.from('tickets')
      .select('id,priority,status,created_at,resolved_at,sla_config_id').eq('id', ticketId).maybeSingle()
    if (error) throw error
    if (!ticket) return null

    // Reading a ticket never creates settings or updates the ticket. A missing
    // saved configuration uses the same local defaults for staff and customers.
    const defaults = DEFAULT_SLA_CONFIGS.find(config => config.priority === ticket.priority) ||
      DEFAULT_SLA_CONFIGS.find(config => config.priority === TicketPriority.MEDIUM)!
    let settings: SLASettings = {
      id: defaults.id, name: defaults.name,
      first_response_time: defaults.responseTime, resolution_time: defaults.resolutionTime
    }
    if (ticket.sla_config_id) {
      const { data: saved, error: configError } = await supabase.from('sla_configs')
        .select('id,name,first_response_time,resolution_time').eq('id', ticket.sla_config_id).maybeSingle()
      if (configError) throw configError
      if (saved) settings = saved
    }

    const [{ data: pauses, error: pausesError }, { data: firstReply, error: replyError }] = await Promise.all([
      supabase.from('sla_pauses').select('id,ticket_id,reason,created_at,resumed_at').eq('ticket_id', ticketId).order('created_at'),
      supabase.from('messages').select('created_at').eq('ticket_id', ticketId).eq('author_type', 'agent').eq('is_internal', false).order('created_at').limit(1).maybeSingle()
    ])
    if (pausesError) throw pausesError
    if (replyError) throw replyError
    const allPauses = (pauses || []) as SLAPause[]
    const started = new Date(ticket.created_at).getTime()
    const completed = ['resolved', 'closed'].includes(ticket.status)
    const end = completed && ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : Date.now()
    const pausedMilliseconds = (until: number) => allPauses.reduce((total, pause) => {
      const start = Math.max(started, new Date(pause.created_at).getTime())
      const stop = Math.min(until, pause.resumed_at ? new Date(pause.resumed_at).getTime() : until)
      return total + Math.max(0, stop - start)
    }, 0)
    const totalPaused = pausedMilliseconds(end)
    const activePause = allPauses.find(pause => !pause.resumed_at)
    const responseEnd = firstReply ? new Date(firstReply.created_at).getTime() : end
    const responseElapsed = Math.max(0, responseEnd - started - pausedMilliseconds(responseEnd))
    const elapsed = Math.max(0, end - started - totalPaused)
    const responseBreached = responseElapsed > settings.first_response_time * 60000
    const resolutionBreached = elapsed > settings.resolution_time * 60000
    const deadline = started + settings.resolution_time * 60000 + totalPaused

    return {
      ticketId, configId: settings.id, config: settings, name: settings.name,
      startedAt: ticket.created_at, pausedAt: activePause?.created_at,
      totalPausedTime: totalPaused / 60000,
      responseBreached, resolutionBreached,
      isPaused: !!activePause && !completed, isCompleted: completed,
      isBreached: responseBreached || resolutionBreached,
      elapsedTime: elapsed, remainingTime: settings.resolution_time * 60000 - elapsed,
      breachTime: new Date(deadline), pauses: allPauses
    }
  },

  async pauseSLA(context: ServerContext, ticketId: string, reason: string): Promise<boolean> {
    if (!reason.trim()) throw new Error('A pause reason is required')
    const { supabase, user } = await getStaff(context)
    const { data: ticket, error: ticketError } = await supabase.from('tickets').select('id,status').eq('id', ticketId).maybeSingle()
    if (ticketError) throw ticketError
    if (!ticket) throw new Error('Ticket not found')
    if (['resolved', 'closed'].includes(ticket.status)) throw new Error('Completed tickets cannot be paused')
    const { data: existing, error: checkError } = await supabase.from('sla_pauses')
      .select('id').eq('ticket_id', ticketId).is('resumed_at', null).maybeSingle()
    if (checkError) throw checkError
    if (existing) return true
    const { error } = await supabase.from('sla_pauses').insert({ ticket_id: ticketId, reason: reason.trim(), created_by: user.id })
    if (error) throw error
    return true
  },

  async resumeSLA(context: ServerContext, ticketId: string): Promise<boolean> {
    const { supabase, user } = await getStaff(context)
    const { data: active, error: checkError } = await supabase.from('sla_pauses')
      .select('id').eq('ticket_id', ticketId).is('resumed_at', null).maybeSingle()
    if (checkError) throw checkError
    if (!active) return true
    const { error } = await supabase.from('sla_pauses').update({ resumed_at: new Date().toISOString(), resumed_by: user.id })
      .eq('id', active.id).is('resumed_at', null)
    if (error) throw error
    return true
  }
}
