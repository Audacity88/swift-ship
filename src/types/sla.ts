import { TicketStatus, TicketPriority } from './ticket'

export interface SLAConfig {
  id: string
  name: string
  description?: string
  priority: TicketPriority
  responseTime: number // minutes
  resolutionTime: number // minutes
  businessHours?: {
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
    workDays: number[] // 0-6, where 0 is Sunday
  }
  escalations: SLAEscalation[]
}

export interface SLAEscalation {
  threshold: number // percentage of time elapsed
  actions: SLAAction[]
}

export type SLAAction = 
  | { type: 'notify'; roles: ('assignee' | 'manager' | 'team')[] }
  | { type: 'escalate_priority' }
  | { type: 'reassign'; teamId: string }
  | { type: 'custom'; action: (ticketId: string) => Promise<void> }

export interface SLAState {
  ticketId: string
  configId: string
  startedAt: string
  pausedAt?: string
  breachedAt?: string
  responseBreached?: boolean
  resolutionBreached?: boolean
  totalPausedTime: number // minutes
  lastEscalationAt?: string
  lastEscalationThreshold?: number
}

export interface StatusAutomation {
  id: string
  name: string
  description?: string
  conditions: StatusCondition[]
  actions: StatusAction[]
  isActive: boolean
}

export interface StatusCondition {
  type: 'time_in_status' | 'priority' | 'tag' | 'custom'
  params: {
    status?: TicketStatus
    timeThreshold?: number // minutes
    minPriority?: TicketPriority
    tags?: string[]
    customCheck?: (ticketId: string) => Promise<boolean>
  }
}

export type StatusAction = 
  | { type: 'change_status'; status: TicketStatus }
  | { type: 'add_tag'; tags: string[] }
  | { type: 'notify'; roles: ('assignee' | 'customer' | 'team')[] }
  | { type: 'custom'; action: (ticketId: string) => Promise<void> }

// Default SLA configurations
export const DEFAULT_SLA_CONFIGS: SLAConfig[] = [
  {
    id: 'urgent_sla',
    name: 'Urgent Tickets',
    priority: TicketPriority.URGENT,
    responseTime: 30, // 30 minutes
    resolutionTime: 240, // 4 hours
    escalations: [
      {
        threshold: 50,
        actions: [
          { type: 'notify', roles: ['assignee', 'team'] }
        ]
      },
      {
        threshold: 75,
        actions: [
          { type: 'notify', roles: ['assignee', 'manager'] },
          { type: 'escalate_priority' }
        ]
      },
      {
        threshold: 90,
        actions: [
          { type: 'notify', roles: ['manager'] },
          { type: 'reassign', teamId: 'escalation_team' }
        ]
      }
    ]
  },
  {
    id: 'high_sla',
    name: 'High Priority',
    priority: TicketPriority.HIGH,
    responseTime: 60, // 1 hour
    resolutionTime: 480, // 8 hours
    escalations: [
      {
        threshold: 75,
        actions: [
          { type: 'notify', roles: ['assignee', 'team'] }
        ]
      },
      {
        threshold: 90,
        actions: [
          { type: 'notify', roles: ['manager'] },
          { type: 'escalate_priority' }
        ]
      }
    ]
  },
  {
    id: 'medium_sla',
    name: 'Medium Priority',
    priority: TicketPriority.MEDIUM,
    responseTime: 240, // 4 hours
    resolutionTime: 1440, // 24 hours
    escalations: [
      {
        threshold: 75,
        actions: [
          { type: 'notify', roles: ['assignee'] }
        ]
      },
      {
        threshold: 90,
        actions: [
          { type: 'notify', roles: ['team'] },
          { type: 'escalate_priority' }
        ]
      }
    ]
  },
  {
    id: 'low_sla',
    name: 'Low Priority',
    priority: TicketPriority.LOW,
    responseTime: 480, // 8 hours
    resolutionTime: 2880, // 48 hours
    escalations: [
      {
        threshold: 90,
        actions: [
          { type: 'notify', roles: ['assignee'] }
        ]
      }
    ]
  }
]

// Default status automations
export const DEFAULT_STATUS_AUTOMATIONS: StatusAutomation[] = [
  {
    id: 'auto_waiting',
    name: 'Auto-waiting on Customer Response',
    description: 'Automatically set ticket to waiting status when pending customer response',
    conditions: [
      {
        type: 'time_in_status',
        params: {
          status: TicketStatus.IN_PROGRESS,
          timeThreshold: 1440 // 24 hours
        }
      }
    ],
    actions: [
      { type: 'change_status', status: TicketStatus.OPEN },
      { type: 'notify', roles: ['customer'] }
    ],
    isActive: true
  },
  {
    id: 'auto_close',
    name: 'Auto-close Resolved Tickets',
    description: 'Automatically close tickets that have been resolved for 7 days',
    conditions: [
      {
        type: 'time_in_status',
        params: {
          status: TicketStatus.RESOLVED,
          timeThreshold: 10080 // 7 days
        }
      }
    ],
    actions: [
      { type: 'change_status', status: TicketStatus.CLOSED },
      { type: 'notify', roles: ['assignee', 'customer'] }
    ],
    isActive: true
  }
] 