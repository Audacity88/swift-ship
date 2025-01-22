import { supabase } from '@/lib/supabase'
import type { TicketStatus } from '@/types/ticket'

export const slaService = {
  async getTicketSLA(ticketId: string): Promise<any> {
    // fetch from "sla_states" by ticket_id
    const { data, error } = await supabase
      .from('sla_states')
      .select('*')
      .eq('ticket_id', ticketId)
      .single()

    if (error) {
      console.error('Failed to get SLA state:', error)
      return null
    }
    return data
  },

  async pauseSLA(ticketId: string, reason: string): Promise<boolean> {
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
    return true
  },

  async resumeSLA(ticketId: string): Promise<boolean> {
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
    return true
  },
}