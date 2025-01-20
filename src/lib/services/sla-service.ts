import type { 
  SLAConfig, 
  StatusAutomation,
  StatusCondition,
  StatusAction,
  SLAAction
} from '@/types/sla'
import { DEFAULT_SLA_CONFIGS, DEFAULT_STATUS_AUTOMATIONS } from '@/types/sla'
import type { Ticket } from '@/types/ticket'

export interface SLAState {
  ticketId: string
  configId: string
  startedAt: string
  totalPausedTime: number
  pausedAt?: string
  responseBreached?: boolean
  resolutionBreached?: boolean
  breachedAt?: string
  lastEscalationThreshold?: number
}

export class SLAService {
  private slaConfigs: SLAConfig[]
  private statusAutomations: StatusAutomation[]

  constructor(
    customSLAConfigs: SLAConfig[] = [],
    customAutomations: StatusAutomation[] = []
  ) {
    this.slaConfigs = [...DEFAULT_SLA_CONFIGS, ...customSLAConfigs]
    this.statusAutomations = [...DEFAULT_STATUS_AUTOMATIONS, ...customAutomations]
  }

  /**
   * Start SLA tracking for a ticket
   */
  async startSLA(ticket: Ticket): Promise<SLAState | null> {
    const config = this.getSLAConfig(ticket)
    if (!config) return null

    const slaState: SLAState = {
      ticketId: ticket.id,
      configId: config.id,
      startedAt: new Date().toISOString(),
      totalPausedTime: 0
    }

    // TODO: Save to database
    return slaState
  }

  /**
   * Pause SLA tracking (e.g., when waiting for customer)
   */
  async pauseSLA(ticketId: string): Promise<SLAState | null> {
    // TODO: Fetch current state from database
    const state = await this.getSLAState(ticketId)
    if (!state || state.pausedAt) return state

    const updatedState: SLAState = {
      ticketId: state.ticketId,
      configId: state.configId,
      startedAt: state.startedAt,
      totalPausedTime: state.totalPausedTime,
      pausedAt: new Date().toISOString()
    }

    return updatedState
  }

  /**
   * Resume SLA tracking
   */
  async resumeSLA(ticketId: string): Promise<SLAState | null> {
    // TODO: Fetch current state from database
    const state = await this.getSLAState(ticketId)
    if (!state || !state.pausedAt) return state

    const pausedDuration = Date.now() - new Date(state.pausedAt).getTime()
    const pausedMinutes = Math.floor(pausedDuration / (1000 * 60))

    const updatedState: SLAState = {
      ticketId: state.ticketId,
      configId: state.configId,
      startedAt: state.startedAt,
      totalPausedTime: state.totalPausedTime + pausedMinutes,
      pausedAt: undefined
    }

    return updatedState
  }

  /**
   * Check SLA status and trigger escalations
   */
  async checkSLA(ticket: Ticket): Promise<void> {
    const state = await this.getSLAState(ticket.id)
    if (!state || state.pausedAt) return

    const config = this.slaConfigs.find(c => c.id === state.configId)
    if (!config) return

    const elapsed = this.getElapsedTime(state)
    const threshold = Math.floor((elapsed / config.resolutionTime) * 100)

    // Check for breaches
    if (elapsed > config.responseTime && !state.responseBreached) {
      await this.handleSLABreach(ticket, state, 'response')
    }

    if (elapsed > config.resolutionTime && !state.resolutionBreached) {
      await this.handleSLABreach(ticket, state, 'resolution')
    }

    // Check for escalations
    const pendingEscalations = config.escalations
      .filter(e => e.threshold > (state.lastEscalationThreshold || 0) && e.threshold <= threshold)
      .sort((a, b) => a.threshold - b.threshold)

    for (const escalation of pendingEscalations) {
      await this.executeEscalationActions(ticket, escalation.actions)
      await this.updateLastEscalation(state, escalation.threshold)
    }
  }

  /**
   * Check and execute status automations
   */
  async checkAutomations(ticket: Ticket): Promise<void> {
    const activeAutomations = this.statusAutomations.filter(a => a.isActive)

    for (const automation of activeAutomations) {
      const shouldExecute = await this.checkConditions(ticket, automation.conditions)
      if (shouldExecute) {
        await this.executeStatusActions(ticket, automation.actions)
      }
    }
  }

  /**
   * Get current SLA state
   */
  async getSLAState(ticketId: string): Promise<SLAState | null> {
    // TODO: Fetch from database
    return null
  }

  /**
   * Get appropriate SLA config for a ticket
   */
  private getSLAConfig(ticket: Ticket): SLAConfig | null {
    return this.slaConfigs.find(config => config.priority === ticket.priority) || null
  }

  /**
   * Calculate elapsed time considering business hours and paused time
   */
  private getElapsedTime(state: SLAState): number {
    const config = this.slaConfigs.find(c => c.id === state.configId)
    if (!config) return 0

    const now = new Date()
    const start = new Date(state.startedAt)
    let elapsed = (now.getTime() - start.getTime()) / (1000 * 60) // minutes

    // Subtract paused time
    elapsed -= state.totalPausedTime

    // Consider business hours if configured
    if (config.businessHours) {
      // TODO: Implement business hours calculation
    }

    return Math.max(0, elapsed)
  }

  /**
   * Handle SLA breach
   */
  private async handleSLABreach(
    ticket: Ticket,
    state: SLAState,
    type: 'response' | 'resolution'
  ): Promise<void> {
    const updates: Partial<SLAState> = {
      breachedAt: new Date().toISOString()
    }

    if (type === 'response') {
      updates.responseBreached = true
    } else {
      updates.resolutionBreached = true
    }

    // TODO: Save breach state
    // TODO: Trigger notifications
  }

  /**
   * Execute escalation actions
   */
  private async executeEscalationActions(
    ticket: Ticket,
    actions: SLAAction[]
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'notify':
          // TODO: Send notifications
          break

        case 'escalate_priority':
          // TODO: Escalate ticket priority
          break

        case 'reassign':
          // TODO: Reassign ticket
          break

        case 'custom':
          await action.action(ticket.id)
          break
      }
    }
  }

  /**
   * Update last escalation state
   */
  private async updateLastEscalation(
    state: SLAState,
    threshold: number
  ): Promise<void> {
    // TODO: Save to database
  }

  /**
   * Check automation conditions
   */
  private async checkConditions(
    ticket: Ticket,
    conditions: StatusCondition[]
  ): Promise<boolean> {
    for (const condition of conditions) {
      let met = false

      switch (condition.type) {
        case 'time_in_status':
          if (condition.params.status === ticket.status) {
            const timeInStatus = Date.now() - new Date(ticket.metadata.updatedAt).getTime()
            const thresholdMs = (condition.params.timeThreshold || 0) * 60 * 1000
            met = timeInStatus >= thresholdMs
          }
          break

        case 'priority':
          if (condition.params.minPriority) {
            const priorities = ['low', 'medium', 'high', 'urgent']
            const minIndex = priorities.indexOf(condition.params.minPriority)
            const currentIndex = priorities.indexOf(ticket.priority)
            met = currentIndex >= minIndex
          }
          break

        case 'tag':
          if (condition.params.tags) {
            const ticketTags = new Set(ticket.metadata.tags.map(t => t.id))
            met = condition.params.tags.every(tag => ticketTags.has(tag))
          }
          break

        case 'custom':
          if (condition.params.customCheck) {
            met = await condition.params.customCheck(ticket.id)
          }
          break
      }

      if (!met) return false
    }

    return true
  }

  /**
   * Execute status automation actions
   */
  private async executeStatusActions(
    ticket: Ticket,
    actions: StatusAction[]
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'change_status':
          // TODO: Update ticket status
          break

        case 'add_tag':
          // TODO: Add tags to ticket
          break

        case 'notify':
          // TODO: Send notifications
          break

        case 'custom':
          await action.action(ticket.id)
          break
      }
    }
  }
}

// Create singleton instance
export const slaService = new SLAService() 