import { supabase } from '@/lib/supabase'
import { TicketStatus, TicketPriority } from '@/types/enums'
import { DEFAULT_SLA_CONFIGS, type SLAConfig } from '@/types/sla'
import type { SLAState } from '@/types/sla'

// Map priorities to their default SLA config IDs
const PRIORITY_TO_CONFIG_ID: Record<TicketPriority, string> = {
  [TicketPriority.URGENT]: 'urgent_sla',
  [TicketPriority.HIGH]: 'high_sla',
  [TicketPriority.MEDIUM]: 'medium_sla',
  [TicketPriority.LOW]: 'low_sla'
}

export class SLAService {
  private authStateReady: boolean = false
  private authCheckPromise: Promise<void>

  constructor() {
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

  async getTicketSLA(ticketId: string): Promise<SLAState | null> {
    try {
      // Wait for auth state to be ready
      if (!this.authStateReady) {
        await this.authCheckPromise
      }

      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!session) {
        console.warn('No active session after auth ready')
        return null
      }

      // Get ticket priority first
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('priority, created_at')
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.warn('Failed to fetch ticket:', ticketError)
        return null
      }

      // Get existing SLA state
      const { data: slaState, error: slaError } = await supabase
        .from('sla_states')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle()

      if (slaError) {
        console.warn('Failed to fetch SLA state:', slaError)
        return null
      }

      // If SLA state exists, return it
      if (slaState) {
        return slaState
      }

      // Otherwise create a new SLA state
      const priority = ticket.priority as TicketPriority
      const configId = DEFAULT_SLA_CONFIGS[priority]?.id

      if (!configId) {
        console.warn('No SLA config found for priority:', priority)
        return null
      }

      // Create new SLA state
      const { data: newState, error: createError } = await supabase
        .from('sla_states')
        .insert({
          ticket_id: ticketId,
          config_id: configId,
          start_time: ticket.created_at,
          paused: false
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create SLA state:', createError)
        return null
      }

      return newState
    } catch (error) {
      console.error('Error getting ticket SLA:', error)
      return null
    }
  }

  async pauseSLA(ticketId: string, reason: string): Promise<boolean> {
    try {
      // Wait for auth state to be ready
      if (!this.authStateReady) {
        await this.authCheckPromise
      }

      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      
      if (!session) {
        console.warn('No active session after auth ready')
        return false
      }

      // set paused_at = now, keep track of reason in an audit
      const { data: state, error: fetchError } = await supabase
        .from('sla_states')
        .select('*')
        .eq('ticket_id', ticketId)
        .single()

      if (fetchError || !state) {
        console.error('No SLA state found or error:', fetchError)
        return false
      }

      if (state.paused_at) {
        console.error('SLA is already paused')
        return false
      }

      const { error: updateError } = await supabase
        .from('sla_states')
        .update({
          paused_at: new Date().toISOString(),
        })
        .eq('ticket_id', ticketId)

      if (updateError) {
        console.error('Failed to pause SLA:', updateError)
        return false
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: 'ticket',
          entity_id: ticketId,
          action: 'sla_pause',
          changes: { reason },
          actor_id: session.user.id,
          actor_type: 'agent'
        })

      if (auditError) {
        console.error('Failed to create audit log:', auditError)
      }

      return true
    } catch (error) {
      console.error('Error in pauseSLA:', error)
      return false
    }
  }

  async resumeSLA(ticketId: string): Promise<boolean> {
    try {
      // Wait for auth state to be ready
      if (!this.authStateReady) {
        await this.authCheckPromise
      }

      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      
      if (!session) {
        console.warn('No active session after auth ready')
        return false
      }

      // remove paused_at, add to total_paused_time
      const { data: state, error: fetchError } = await supabase
        .from('sla_states')
        .select('*')
        .eq('ticket_id', ticketId)
        .single()

      if (fetchError || !state) {
        console.error('No SLA state found or error:', fetchError)
        return false
      }

      if (!state.paused_at) {
        console.error('SLA not paused, cannot resume')
        return false
      }

      const pausedAt = new Date(state.paused_at)
      const additionalPausedMinutes = Math.floor((Date.now() - pausedAt.getTime()) / (1000 * 60))
      const totalPaused = (state.total_paused_time || 0) + additionalPausedMinutes

      const { error: updateError } = await supabase
        .from('sla_states')
        .update({
          paused_at: null,
          total_paused_time: totalPaused,
        })
        .eq('ticket_id', ticketId)

      if (updateError) {
        console.error('Failed to resume SLA:', updateError)
        return false
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: 'ticket',
          entity_id: ticketId,
          action: 'sla_resume',
          changes: { additionalPausedMinutes },
          actor_id: session.user.id,
          actor_type: 'agent'
        })

      if (auditError) {
        console.error('Failed to create audit log:', auditError)
      }

      return true
    } catch (error) {
      console.error('Error in resumeSLA:', error)
      return false
    }
  }
}

// Create singleton instance
export const slaService = new SLAService()