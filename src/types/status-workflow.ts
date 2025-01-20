import type { TicketStatus } from './ticket'
import type { Agent } from './ticket'

export interface StatusTransition {
  from: TicketStatus
  to: TicketStatus
  requiredRole?: 'agent' | 'admin'
  conditions?: TransitionCondition[]
  automationHooks?: TransitionHook[]
}

export interface TransitionCondition {
  type: 'required_fields' | 'time_elapsed' | 'priority_check' | 'custom'
  params: {
    fieldIds?: string[]
    minTimeInStatus?: number // in minutes
    minPriority?: 'low' | 'medium' | 'high' | 'urgent'
    customCheck?: (ticket: any) => boolean
  }
}

export interface TransitionHook {
  type: 'notification' | 'field_update' | 'sla_update' | 'custom'
  params: {
    notifyRoles?: ('customer' | 'assignee' | 'followers')[]
    fieldUpdates?: { fieldId: string; value: any }[]
    slaAction?: 'start' | 'pause' | 'resume' | 'stop'
    customAction?: (ticket: any) => Promise<void>
  }
}

export interface StatusHistory {
  id: string
  ticketId: string
  fromStatus: TicketStatus
  toStatus: TicketStatus
  changedBy: Agent
  changedAt: string
  reason?: string
  automationTriggered?: boolean
}

// Default status workflow configuration
export const DEFAULT_STATUS_WORKFLOW: StatusTransition[] = [
  {
    from: 'open',
    to: 'in_progress',
    conditions: [
      {
        type: 'required_fields',
        params: {
          fieldIds: ['assignee']
        }
      }
    ],
    automationHooks: [
      {
        type: 'notification',
        params: {
          notifyRoles: ['assignee', 'followers']
        }
      }
    ]
  },
  {
    from: 'in_progress',
    to: 'waiting',
    automationHooks: [
      {
        type: 'notification',
        params: {
          notifyRoles: ['customer']
        }
      },
      {
        type: 'sla_update',
        params: {
          slaAction: 'pause'
        }
      }
    ]
  },
  {
    from: 'waiting',
    to: 'in_progress',
    automationHooks: [
      {
        type: 'sla_update',
        params: {
          slaAction: 'resume'
        }
      }
    ]
  },
  {
    from: 'in_progress',
    to: 'resolved',
    conditions: [
      {
        type: 'required_fields',
        params: {
          fieldIds: ['resolution']
        }
      }
    ],
    automationHooks: [
      {
        type: 'notification',
        params: {
          notifyRoles: ['customer', 'followers']
        }
      },
      {
        type: 'sla_update',
        params: {
          slaAction: 'stop'
        }
      }
    ]
  },
  {
    from: 'resolved',
    to: 'closed',
    conditions: [
      {
        type: 'time_elapsed',
        params: {
          minTimeInStatus: 10080 // 7 days in minutes
        }
      }
    ]
  }
] 