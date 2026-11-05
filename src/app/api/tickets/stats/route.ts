import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const responseHours: Record<string, number> = { urgent: 1, high: 4, medium: 8, low: 24 }
const resolutionHours: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 48 }

interface TicketRow { id: string; status: string; priority: string; created_at: string; resolved_at: string | null; assignee_id: string | null }
interface EventRow { ticket_id: string; created_at: string; author_type?: string; to_status?: string }

// RLS applies to every query; this endpoint never uses a service-role client.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: agent } = await supabase.from('agents').select('id,role').eq('id', user.id).maybeSingle()
    if (!agent || !['admin', 'agent'].includes(agent.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const params = request.nextUrl.searchParams
    const from = params.get('startDate') || params.get('from')
    const to = params.get('endDate') || params.get('to')
    if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from) > Date.parse(to)) {
      return NextResponse.json({ error: 'Provide a valid from/to or startDate/endDate range.' }, { status: 400 })
    }
    // Page through PostgREST's row cap so counts remain accurate beyond 1,000 tickets.
    const tickets: TicketRow[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from('tickets')
        .select('id,status,priority,created_at,resolved_at,assignee_id')
        .gte('created_at', new Date(from).toISOString()).lte('created_at', new Date(to).toISOString())
        .order('id').range(offset, offset + 999)
      if (error) throw error
      tickets.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    const messages: EventRow[] = []
    const history: EventRow[] = []
    for (let offset = 0; offset < tickets.length; offset += 100) {
      const ids = tickets.slice(offset, offset + 100).map(ticket => ticket.id)
      // Fetch each page independently to preserve correctness for busy conversations.
      for (const [table, fields, target] of [
        ['messages', 'ticket_id,created_at,author_type', messages],
        ['status_history', 'ticket_id,created_at,to_status', history],
      ] as const) {
        for (let page = 0; ; page += 1000) {
          let query = supabase.from(table).select(fields).in('ticket_id', ids).order('created_at').order('id')
          if (table === 'messages') query = query.eq('author_type', 'agent')
          else query = query.eq('to_status', 'resolved')
          const { data, error } = await query.range(page, page + 999)
          if (error) throw error
          target.push(...(data || []))
          if (!data || data.length < 1000) break
        }
      }
    }
    const { data: agents, error: agentError } = await supabase.from('agents').select('id,name')
    if (agentError) throw agentError
    const counts = { status: {} as Record<string, number>, priority: {} as Record<string, number> }
    const resolutions: Record<string, number[]> = {}
    const sla: Record<string, { total: number; response_breached: number; resolution_breached: number }> = {}
    const volume: Record<string, { date: string; created: number; resolved: number }> = {}
    const metrics = new Map((agents || []).map(a => [a.id, { id: a.id, name: a.name, total_assigned: 0, total_resolved: 0, avg_resolution_hours: 0, sla_breaches: 0, hours: [] as number[] }]))
    const first = (rows: EventRow[], id: string) => rows.find(row => row.ticket_id === id)?.created_at
    let totalResponseHours = 0
    let responses = 0
    for (const ticket of tickets) {
      counts.status[ticket.status] = (counts.status[ticket.status] || 0) + 1
      counts.priority[ticket.priority] = (counts.priority[ticket.priority] || 0) + 1
      const day = ticket.created_at.slice(0, 10)
      volume[day] ||= { date: day, created: 0, resolved: 0 }
      volume[day].created++
      const resolvedAt = first(history, ticket.id) || ticket.resolved_at
      const resolved = resolvedAt ? (Date.parse(resolvedAt) - Date.parse(ticket.created_at)) / 3600000 : null
      if (resolved !== null) {
        ;(resolutions[ticket.priority] ||= []).push(resolved)
        volume[day].resolved++
      }
      const responseAt = first(messages, ticket.id)
      const response = responseAt ? (Date.parse(responseAt) - Date.parse(ticket.created_at)) / 3600000 : null
      if (response !== null) { totalResponseHours += response; responses++ }
      const elapsed = (Date.now() - Date.parse(ticket.created_at)) / 3600000
      const responseBreached = (response ?? elapsed) > responseHours[ticket.priority]
      const resolutionBreached = (resolved ?? elapsed) > resolutionHours[ticket.priority]
      const state = sla[ticket.priority] ||= { total: 0, response_breached: 0, resolution_breached: 0 }
      state.total++
      if (responseBreached) state.response_breached++
      if (resolutionBreached) state.resolution_breached++
      const metric = ticket.assignee_id ? metrics.get(ticket.assignee_id) : undefined
      if (metric) {
        metric.total_assigned++
        if (resolved !== null) { metric.total_resolved++; metric.hours.push(resolved) }
        if (responseBreached || resolutionBreached) metric.sla_breaches++
      }
    }
    const resolutionTimes = Object.entries(resolutions).map(([priority, hours]) => ({ priority, avg_hours: hours.reduce((a, b) => a + b, 0) / hours.length, min_hours: Math.min(...hours), max_hours: Math.max(...hours) }))
    const agentMetrics = [...metrics.values()].map(({ hours, ...metric }) => ({ ...metric, avg_resolution_hours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0 }))
    return NextResponse.json({
      openTickets: counts.status.open || 0,
      avgResponseTime: responses ? `${(totalResponseHours / responses).toFixed(1)}h` : 'No responses yet',
      customerSatisfaction: null,
      totalConversations: tickets.length,
      detailedStats: {
        counts,
        resolutionTimes: Object.fromEntries(resolutionTimes.map(r => [r.priority, { avg: r.avg_hours, min: r.min_hours, max: r.max_hours }])),
        slaCompliance: Object.fromEntries(Object.entries(sla).map(([priority, value]) => [priority, { total: value.total, responseCompliance: 100 * (value.total - value.response_breached) / value.total, resolutionCompliance: 100 * (value.total - value.resolution_breached) / value.total }])),
        volumeTrends: Object.values(volume).sort((a, b) => a.date.localeCompare(b.date)),
        agentMetrics: agentMetrics.map(a => ({ id: a.id, name: a.name, metrics: { totalAssigned: a.total_assigned, totalResolved: a.total_resolved, avgResolutionTime: a.avg_resolution_hours, slaBreaches: a.sla_breaches } })),
      },
      ticket_counts: Object.entries(counts).flatMap(([type, values]) => Object.entries(values).map(([key, count]) => ({ type, key, count }))),
      resolution_time: resolutionTimes,
      sla_stats: Object.entries(sla).map(([priority, value]) => ({ priority, ...value })),
      volume_trends: Object.values(volume), agent_metrics: agentMetrics,
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load ticket statistics.' }, { status: 500 })
  }
}
