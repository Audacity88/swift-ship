import type { Agent, TicketStatus } from '@/types/ticket'
import type { StatusTransition, StatusHistory, TransitionCondition } from '@/types/status-workflow'
import { DEFAULT_STATUS_WORKFLOW, normalizeTicketStatus } from '@/types/status-workflow'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export type { StatusTransition, TransitionCondition } from '@/types/status-workflow'

export class StatusWorkflowService {
  private workflow: StatusTransition[]

  constructor(customWorkflow?: StatusTransition[]) {
    this.workflow = customWorkflow || DEFAULT_STATUS_WORKFLOW
  }

  private async getStaff(context: ServerContext) {
    const supabase = getServerSupabase(context)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')
    const { data: agent, error: agentError } = await supabase.from('agents')
      .select('id,role').eq('id', user.id).maybeSingle()
    if (agentError) throw agentError
    if (!agent || !['admin', 'agent', 'supervisor'].includes(agent.role)) throw new Error('Staff access required')
    return { supabase, agent }
  }

  async getAvailableTransitions(context: ServerContext, ticketId: string, fromStatus: TicketStatus): Promise<StatusTransition[]> {
    const { supabase, agent } = await this.getStaff(context)
    const { data: ticket, error } = await supabase.from('tickets').select('status').eq('id', ticketId).maybeSingle()
    if (error) throw error
    if (!ticket) throw new Error('Ticket not found')
    // The database is authoritative if a different browser has changed the ticket.
    const current = normalizeTicketStatus(ticket.status || fromStatus)
    return this.workflow.filter(transition => transition.fromStatus === current &&
      (!transition.allowedRoles || transition.allowedRoles.includes(agent.role)))
  }

  async validateTransition(
    context: ServerContext, ticketId: string, fromStatus: TicketStatus, toStatus: TicketStatus,
    legacyAgent?: Pick<Agent, 'id' | 'role'>
  ): Promise<{ valid: boolean; message?: string }> {
    const { supabase, agent } = await this.getStaff(context)
    if (legacyAgent && legacyAgent.id !== agent.id) return { valid: false, message: 'Your sign-in session changed. Refresh the ticket and try again.' }
    const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', ticketId).maybeSingle()
    if (error) throw error
    if (!ticket) return { valid: false, message: 'Ticket not found' }
    const current = normalizeTicketStatus(ticket.status)
    if (current !== normalizeTicketStatus(fromStatus)) return { valid: false, message: 'The ticket status changed. Refresh the ticket and try again.' }
    const transition = this.workflow.find(item => item.fromStatus === current && item.toStatus === normalizeTicketStatus(toStatus))
    if (!transition) return { valid: false, message: `Invalid transition from ${current} to ${toStatus}` }
    if (transition.allowedRoles && !transition.allowedRoles.includes(agent.role)) return { valid: false, message: 'Your role cannot make this status change' }
    for (const condition of transition.conditions || []) {
      const result = this.checkCondition(condition, ticket)
      if (!result.valid) return result
    }
    return { valid: true }
  }

  async executeTransition(
    context: ServerContext, ticketId: string, fromStatus: TicketStatus, toStatus: TicketStatus,
    legacyAgent?: Pick<Agent, 'id' | 'role'>, reason?: string
  ): Promise<void> {
    const validation = await this.validateTransition(context, ticketId, fromStatus, toStatus, legacyAgent)
    if (!validation.valid) throw new Error(validation.message || 'Invalid transition')
    const { supabase, agent } = await this.getStaff(context)
    // The invoker RPC independently verifies auth.uid(), the agent role, and the
    // current transition while holding a row lock. It records history atomically.
    const { error } = await supabase.rpc('execute_status_transition', {
      p_ticket_id: ticketId, p_new_status: normalizeTicketStatus(toStatus),
      p_reason: reason?.trim() || null, p_agent_id: agent.id
    })
    if (error) throw error
  }

  async getStatusHistory(context: ServerContext, ticketId: string): Promise<StatusHistory[]> {
    const { supabase } = await this.getStaff(context)
    const { data, error } = await supabase.from('ticket_status_history').select('*')
      .eq('ticket_id', ticketId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  private checkCondition(condition: TransitionCondition, ticket: Record<string, unknown>): { valid: boolean; message?: string } {
    let valid = false
    const params = condition.params
    switch (condition.type) {
      case 'required_fields':
        valid = Array.isArray(params.fields) && params.fields.every(field => typeof field === 'string' && !!ticket[field])
        break
      case 'time_elapsed': {
        const threshold = Number(params.minutes ?? Number(params.hours) * 60)
        const changedAt = new Date(String(ticket.resolved_at || ticket.updated_at)).getTime()
        valid = Number.isFinite(threshold) && Number.isFinite(changedAt) && Date.now() - changedAt >= threshold * 60000
        break
      }
      case 'priority_check':
        valid = Array.isArray(params.allowed_priorities) && params.allowed_priorities.includes(ticket.priority)
        break
      default:
        valid = false
    }
    return valid ? { valid: true } : { valid: false, message: condition.message || 'Transition condition not met' }
  }
}

export const statusWorkflow = new StatusWorkflowService()
