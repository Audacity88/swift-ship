import type { Ticket, TicketStatus, Agent } from '@/types/ticket'
import { supabase } from '@/lib/supabase'
import type { 
  StatusTransition as ImportedStatusTransition, 
  TransitionCondition as ImportedTransitionCondition,
  TransitionHook,
  StatusHistory 
} from '@/types/status-workflow'
import { DEFAULT_STATUS_WORKFLOW } from '@/types/status-workflow'

type CustomFieldValue = string | number | boolean | Date | null

interface TicketCustomField {
  id: string
  value: CustomFieldValue
}

export interface TransitionCondition extends Omit<ImportedTransitionCondition, 'message'> {
  message?: string
  type: 'required_fields' | 'time_elapsed' | 'priority_check' | 'custom'
  params: Record<string, any>
}

export interface StatusTransition extends Omit<ImportedStatusTransition, 'conditions'> {
  conditions?: TransitionCondition[]
}

export class StatusWorkflowService {
  private workflow: StatusTransition[]
  private authStateReady: boolean = false
  private authCheckPromise: Promise<void>

  constructor(customWorkflow?: ImportedStatusTransition[]) {
    // Map the imported workflow to include message in conditions
    this.workflow = (customWorkflow || DEFAULT_STATUS_WORKFLOW).map(transition => ({
      ...transition,
      conditions: transition.conditions?.map(condition => ({
        ...condition,
        message: condition.message || 'Transition condition not met'
      }))
    }))

    // Initialize auth state check
    this.authCheckPromise = this.waitForAuthState()
  }

  private async waitForAuthState(): Promise<void> {
    return new Promise((resolve) => {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session || Date.now() - startTime > 5000) { // 5 second timeout
          this.authStateReady = true
          resolve()
        } else {
          setTimeout(checkAuth, 100)
        }
      }
      const startTime = Date.now()
      checkAuth()
    })
  }

  async getAvailableTransitions(ticketId: string, currentStatus: TicketStatus): Promise<StatusTransition[]> {
    try {
      // Wait for auth state to be ready
      if (!this.authStateReady) {
        await this.authCheckPromise
      }

      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      // Get transitions that match the current status
      const possibleTransitions = this.workflow.filter(t => t.from === currentStatus)
      
      if (!session) {
        console.warn('No active session after auth ready, returning basic transitions')
        return possibleTransitions
      }

      // Try to fetch ticket data first
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.warn('Failed to fetch ticket data:', ticketError)
        return possibleTransitions
      }

      // Get current agent data
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (agentError) {
        console.warn('Failed to fetch agent data:', agentError)
        return possibleTransitions
      }

      // Filter transitions based on current status and validate each one
      const availableTransitions = await Promise.all(
        possibleTransitions.map(async transition => {
          const { allowed } = await this.canTransition(ticket, currentStatus, transition.to, agent)
          return allowed ? transition : null
        })
      )

      return availableTransitions.filter((t): t is StatusTransition => t !== null)
    } catch (error) {
      console.error('Error getting available transitions:', error)
      return this.workflow.filter(t => t.from === currentStatus)
    }
  }

  async validateTransition(
    ticketId: string,
    fromStatus: TicketStatus,
    toStatus: TicketStatus
  ): Promise<boolean> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('No active session:', sessionError)
        return false
      }

      const [{ data: ticket }, { data: agent }] = await Promise.all([
        supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single(),
        supabase
          .from('agents')
          .select('*')
          .eq('id', session.user.id)
          .single()
      ])

      if (!ticket || !agent) {
        throw new Error('Failed to fetch required data')
      }

      const { allowed } = await this.canTransition(ticket, fromStatus, toStatus, agent)
      return allowed
    } catch (error) {
      console.error('Error validating transition:', error)
      return false
    }
  }

  async canTransition(
    ticket: Ticket,
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    agent: Agent
  ): Promise<{ allowed: boolean; reason?: string }> {
    const transition = this.workflow.find(t => t.from === fromStatus && t.to === toStatus)

    if (!transition) {
      return { allowed: false, reason: 'Invalid status transition' }
    }

    // Check role requirements
    if (transition.requiredRole && agent.role !== transition.requiredRole) {
      return { allowed: false, reason: `Requires ${transition.requiredRole} role` }
    }

    // Check conditions
    if (transition.conditions) {
      for (const condition of transition.conditions) {
        const validationResult = await this.validateCondition(condition, ticket)
        if (!validationResult.valid) {
          return { allowed: false, reason: validationResult.reason }
        }
      }
    }

    return { allowed: true }
  }

  private async validateCondition(condition: TransitionCondition, ticket: Ticket): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Add your condition validation logic here
      return { valid: true }
    } catch (error) {
      console.error('Error validating condition:', error)
      return { valid: false, reason: 'Failed to validate condition' }
    }
  }

  async executeTransitionHooks(
    ticket: Ticket,
    transition: StatusTransition
  ): Promise<void> {
    if (!transition.automationHooks) return

    for (const hook of transition.automationHooks) {
      await this.executeHook(hook, ticket)
    }
  }

  private async executeHook(hook: TransitionHook, ticket: Ticket): Promise<void> {
    switch (hook.type) {
      case 'notification':
        if (hook.params.notifyRoles) {
          // TODO: Implement notification system
          console.log('Sending notifications to:', hook.params.notifyRoles)
        }
        break

      case 'field_update':
        if (hook.params.fieldUpdates) {
          // TODO: Implement field updates
          console.log('Updating fields:', hook.params.fieldUpdates)
        }
        break

      case 'sla_update':
        if (hook.params.slaAction) {
          // TODO: Implement SLA management
          console.log('SLA action:', hook.params.slaAction)
        }
        break

      case 'custom':
        if (hook.params.customAction) {
          await hook.params.customAction(ticket)
        }
        break
    }
  }

  async createHistoryEntry(
    ticket: Ticket,
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    agent: Agent,
    reason?: string,
    automationTriggered = false
  ): Promise<StatusHistory> {
    const historyEntry: StatusHistory = {
      id: crypto.randomUUID(),
      ticketId: ticket.id,
      fromStatus,
      toStatus,
      changedBy: agent,
      changedAt: new Date().toISOString(),
      reason,
      automationTriggered
    }

    // TODO: Save history entry to database
    return historyEntry
  }
}

// Create singleton instance
export const statusWorkflow = new StatusWorkflowService() 