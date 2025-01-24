import type { Ticket, TicketStatus, Agent } from '@/types/ticket'
import type { 
  StatusTransition as ImportedStatusTransition, 
  TransitionCondition as ImportedTransitionCondition,
  TransitionHook,
  StatusHistory,
  HookType,
  HookParams 
} from '@/types/status-workflow'
import { DEFAULT_STATUS_WORKFLOW } from '@/types/status-workflow'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

type CustomFieldValue = string | number | boolean | Date | null

interface TicketCustomField {
  id: string
  value: CustomFieldValue
}

export interface TransitionCondition extends ImportedTransitionCondition {
  message?: string
  type: 'required_fields' | 'time_elapsed' | 'priority_check' | 'custom'
  params: Record<string, any>
}

export interface StatusTransition extends ImportedStatusTransition {
  from: TicketStatus
  to: TicketStatus
  conditions?: TransitionCondition[]
  allowedRoles?: string[]
  hooks?: TransitionHook[]
}

export class StatusWorkflowService {
  private workflow: StatusTransition[]

  constructor(customWorkflow?: ImportedStatusTransition[]) {
    // Map the imported workflow to include message in conditions
    this.workflow = (customWorkflow || DEFAULT_STATUS_WORKFLOW).map(transition => ({
      ...transition,
      conditions: transition.conditions?.map(condition => ({
        ...condition,
        message: condition.message || 'Transition condition not met'
      }))
    }))
  }

  async getAvailableTransitions(
    context: ServerContext,
    ticketId: string,
    fromStatus: TicketStatus
  ): Promise<StatusTransition[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get agent data for role check
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', user.id)
        .single()

      if (agentError) {
        console.error('Failed to get agent data:', agentError)
        throw agentError
      }

      // Filter transitions based on current status and agent role
      return this.workflow.filter(transition => {
        const isValidTransition = transition.from === fromStatus
        const hasPermission = !transition.allowedRoles || 
          transition.allowedRoles.includes(agent.role)
        return isValidTransition && hasPermission
      })
    } catch (error) {
      console.error('Error in getAvailableTransitions:', error)
      throw error
    }
  }

  async validateTransition(
    context: ServerContext,
    ticketId: string,
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    agent: Agent
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Find the transition
      const transition = this.workflow.find(
        t => t.from === fromStatus && t.to === toStatus
      )

      if (!transition) {
        return {
          valid: false,
          message: `Invalid transition from ${fromStatus} to ${toStatus}`
        }
      }

      // Check role permissions
      if (transition.allowedRoles && !transition.allowedRoles.includes(agent.role)) {
        return {
          valid: false,
          message: `Agent role ${agent.role} not allowed for this transition`
        }
      }

      // Get ticket data for condition checks
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (error) {
        console.error('Failed to get ticket data:', error)
        throw error
      }

      // Check conditions
      if (transition.conditions) {
        for (const condition of transition.conditions) {
          const result = await this.checkCondition(context, condition, ticket)
          if (!result.valid) {
            return result
          }
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('Error in validateTransition:', error)
      throw error
    }
  }

  async executeTransition(
    context: ServerContext,
    ticketId: string,
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    agent: Agent,
    reason?: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Validate transition
      const validation = await this.validateTransition(
        context,
        ticketId,
        fromStatus,
        toStatus,
        agent
      )

      if (!validation.valid) {
        throw new Error(validation.message || 'Invalid transition')
      }

      // Find transition hooks
      const transition = this.workflow.find(
        t => t.from === fromStatus && t.to === toStatus
      )

      // Begin transaction
      const { error: transactionError } = await supabase.rpc('execute_status_transition', {
        p_ticket_id: ticketId,
        p_new_status: toStatus,
        p_reason: reason || null,
        p_agent_id: agent.id
      })

      if (transactionError) {
        console.error('Failed to execute transition:', transactionError)
        throw transactionError
      }

      // Execute hooks if any
      if (transition?.hooks) {
        await this.executeHooks(context, transition.hooks, ticketId, agent)
      }
    } catch (error) {
      console.error('Error in executeTransition:', error)
      throw error
    }
  }

  async getStatusHistory(context: ServerContext, ticketId: string): Promise<StatusHistory[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('ticket_status_history')
        .select(`
          id,
          ticket_id,
          from_status,
          to_status,
          reason,
          created_at,
          agent:agent_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get status history:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getStatusHistory:', error)
      throw error
    }
  }

  private async checkCondition(
    context: ServerContext,
    condition: TransitionCondition,
    ticket: Ticket
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      switch (condition.type) {
        case 'required_fields': {
          const { fields } = condition.params
          for (const field of fields) {
            if (!ticket[field as keyof Ticket]) {
              return {
                valid: false,
                message: condition.message || `Required field ${field} is missing`
              }
            }
          }
          return { valid: true }
        }

        case 'time_elapsed': {
          const { minutes } = condition.params
          const createdAt = new Date(ticket.createdAt)
          const elapsed = (Date.now() - createdAt.getTime()) / (1000 * 60)
          return {
            valid: elapsed >= minutes,
            message: condition.message || `Must wait ${minutes} minutes before transition`
          }
        }

        case 'priority_check': {
          const { allowed_priorities } = condition.params
          return {
            valid: allowed_priorities.includes(ticket.priority),
            message: condition.message || `Priority ${ticket.priority} not allowed for this transition`
          }
        }

        case 'custom': {
          // Custom conditions can be implemented here
          return { valid: true }
        }

        default:
          return { valid: true }
      }
    } catch (error) {
      console.error('Error in checkCondition:', error)
      throw error
    }
  }

  private async executeHooks(
    context: ServerContext,
    hooks: TransitionHook[],
    ticketId: string,
    agent: Agent
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      for (const hook of hooks) {
        switch (hook.type) {
          case 'notify_assigned_agent': {
            // Send notification
            const { error } = await supabase.rpc('send_status_notification', {
              p_ticket_id: ticketId,
              p_agent_id: agent.id,
              p_notification_type: hook.type,
              p_message: hook.params.notifyRoles?.join(',') || ''
            })

            if (error) {
              console.error('Failed to send notification:', error)
              throw error
            }
            break
          }

          case 'update_custom_field': {
            // Update custom field
            const { error } = await supabase.rpc('update_ticket_custom_field', {
              p_ticket_id: ticketId,
              p_field_id: hook.params.fieldId,
              p_value: hook.params.value
            })

            if (error) {
              console.error('Failed to update custom field:', error)
              throw error
            }
            break
          }

          case 'create_audit_log': {
            // Create audit log
            const { error } = await supabase.rpc('create_ticket_audit_log', {
              p_ticket_id: ticketId,
              p_action: hook.params.action || 'status_change',
              p_details: hook.params.details || {}
            })

            if (error) {
              console.error('Failed to create audit log:', error)
              throw error
            }
            break
          }

          default:
            break
        }
      }
    } catch (error) {
      console.error('Error in executeHooks:', error)
      throw error
    }
  }
}

// Export a default instance
export const statusWorkflow = new StatusWorkflowService() 