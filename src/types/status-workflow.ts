import { TicketStatus } from './ticket'

export interface TransitionCondition {
  type: 'required_fields' | 'time_elapsed' | 'priority_check' | 'custom'
  params: Record<string, unknown>
  message?: string
}

export interface StatusTransition {
  fromStatus: TicketStatus
  toStatus: TicketStatus
  allowedRoles?: string[]
  conditions?: TransitionCondition[]
  hooks?: TransitionHook[]
}

export interface TransitionHook {
  type: 'notify_assigned_agent' | 'update_custom_field' | 'create_audit_log'
  params: {
    notifyRoles?: ('customer' | 'assignee' | 'followers')[]
    fieldId?: string
    value?: unknown
    action?: string
    details?: Record<string, unknown>
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

// Keep these pairs in sync with execute_status_transition in the database.
// All changes require a staff identity. A reason is optional for every pair.
const targets: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.OPEN, TicketStatus.WAITING, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.WAITING]: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [TicketStatus.OPEN]
}

export const DEFAULT_STATUS_WORKFLOW: StatusTransition[] = Object.entries(targets).flatMap(([fromStatus, statuses]) =>
  statuses.map(toStatus => ({ fromStatus: fromStatus as TicketStatus, toStatus, allowedRoles: ['agent', 'admin', 'supervisor'], conditions: [] }))
)

export function normalizeTicketStatus(status: string): TicketStatus {
  return (status === 'awaiting_response' ? TicketStatus.WAITING : status) as TicketStatus
}
