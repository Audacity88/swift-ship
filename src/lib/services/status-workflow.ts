import type { Ticket, TicketStatus, Agent } from '@/types/ticket'
import type { StatusTransition, TransitionCondition, TransitionHook, StatusHistory } from '@/types/status-workflow'
import { DEFAULT_STATUS_WORKFLOW } from '@/types/status-workflow'

type CustomFieldValue = string | number | boolean | Date | null

interface TicketCustomField {
  id: string
  value: CustomFieldValue
}

export class StatusWorkflowService {
  private workflow: StatusTransition[]

  constructor(customWorkflow?: StatusTransition[]) {
    this.workflow = customWorkflow || DEFAULT_STATUS_WORKFLOW
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

  private async validateCondition(
    condition: TransitionCondition,
    ticket: Ticket
  ): Promise<{ valid: boolean; reason?: string }> {
    switch (condition.type) {
      case 'required_fields':
        if (condition.params.fieldIds) {
          const missingFields = condition.params.fieldIds.filter(fieldId => {
            const customFields = (ticket.metadata.customFields || []) as unknown as TicketCustomField[]
            const field = customFields.find(f => f.id === fieldId)
            return !field || field.value === null || field.value === undefined
          })
          if (missingFields.length > 0) {
            return { 
              valid: false, 
              reason: `Required fields missing: ${missingFields.join(', ')}` 
            }
          }
        }
        break

      case 'time_elapsed':
        if (condition.params.minTimeInStatus) {
          const timeInStatus = Date.now() - new Date(ticket.metadata.updatedAt).getTime()
          const minTimeMs = condition.params.minTimeInStatus * 60 * 1000 // Convert minutes to ms
          if (timeInStatus < minTimeMs) {
            return { 
              valid: false, 
              reason: `Must remain in status for ${condition.params.minTimeInStatus} minutes` 
            }
          }
        }
        break

      case 'priority_check':
        if (condition.params.minPriority) {
          const priorities = ['low', 'medium', 'high', 'urgent']
          const minPriorityIndex = priorities.indexOf(condition.params.minPriority)
          const ticketPriorityIndex = priorities.indexOf(ticket.priority)
          if (ticketPriorityIndex < minPriorityIndex) {
            return { 
              valid: false, 
              reason: `Requires minimum priority of ${condition.params.minPriority}` 
            }
          }
        }
        break

      case 'custom':
        if (condition.params.customCheck && !condition.params.customCheck(ticket)) {
          return { valid: false, reason: 'Custom condition not met' }
        }
        break
    }

    return { valid: true }
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