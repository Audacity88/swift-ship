import type { TicketStatus } from './ticket'
import type { Agent } from './ticket'

export interface TransitionCondition {
  type: 'required_fields' | 'time_elapsed' | 'priority_check' | 'custom'
  params: Record<string, any>
  message?: string
}

export interface StatusTransition {
  fromStatus: TicketStatus
  toStatus: TicketStatus
  conditions?: TransitionCondition[]
  hooks?: TransitionHook[]
}

export interface TransitionHook {
  type: 'notify_assigned_agent' | 'update_custom_field' | 'create_audit_log'
  params: {
    // Notification params
    notifyRoles?: ('customer' | 'assignee' | 'followers')[]
    
    // Field update params
    fieldId?: string
    value?: any
    
    // Audit log params
    action?: string
    details?: Record<string, any>
  }
}

export interface StatusHistory {
  id: string
  ticket_id: string
  from_status: TicketStatus
  to_status: TicketStatus
  changed_by: string
  reason: string | null
  automation_triggered: boolean
  created_at: string
}

// Default workflow configuration
export const DEFAULT_STATUS_WORKFLOW: StatusTransition[] = [
  {
    fromStatus: 'open',
    toStatus: 'in_progress',
    conditions: []
  },
  {
    fromStatus: 'in_progress',
    toStatus: 'awaiting_response',
    conditions: []
  },
  {
    fromStatus: 'awaiting_response',
    toStatus: 'in_progress',
    conditions: []
  },
  {
    fromStatus: 'in_progress',
    toStatus: 'resolved',
    conditions: [
      {
        type: 'required_fields',
        params: {
          fields: ['resolution_notes']
        },
        message: 'Resolution notes are required'
      }
    ]
  },
  {
    fromStatus: 'resolved',
    toStatus: 'closed',
    conditions: [
      {
        type: 'time_elapsed',
        params: {
          hours: 24
        },
        message: 'Ticket must be resolved for 24 hours before closing'
      }
    ]
  },
  {
    fromStatus: 'closed',
    toStatus: 'open',
    conditions: [
      {
        type: 'priority_check',
        params: {
          minPriority: 'high'
        },
        message: 'Only high priority tickets can be reopened'
      }
    ]
  }
] 