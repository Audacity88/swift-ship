import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { TicketStatus, TicketPriority } from '@/types/enums'
import { DEFAULT_SLA_CONFIGS, type SLAConfig } from '@/types/sla'
import type { SLAState } from '@/types/sla'

// Map priorities to their default SLA config UUIDs
const PRIORITY_TO_CONFIG_ID: Record<TicketPriority, string> = {
  [TicketPriority.URGENT]: '00000000-0000-4000-a000-000000000001',
  [TicketPriority.HIGH]: '00000000-0000-4000-a000-000000000002',
  [TicketPriority.MEDIUM]: '00000000-0000-4000-a000-000000000003',
  [TicketPriority.LOW]: '00000000-0000-4000-a000-000000000004'
}

export const slaService = {
  async getTicketSLA(context: ServerContext, ticketId: string): Promise<SLAState | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          priority,
          status,
          created_at,
          sla_config:sla_config_id (*)
        `)
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.error('Failed to get ticket:', ticketError)
        throw ticketError
      }

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      // Get or create SLA config
      const configId = ticket.sla_config?.id || PRIORITY_TO_CONFIG_ID[ticket.priority]
      let slaConfig = null

      // Try to get existing config
      const { data: existingConfig, error: slaError } = await supabase
        .from('sla_configs')
        .select('*')
        .eq('id', configId)
        .single()

      if (slaError && slaError.code !== 'PGRST116') { // Ignore "no rows returned" error
        console.error('Failed to get SLA config:', slaError)
        throw slaError
      }

      if (existingConfig) {
        slaConfig = existingConfig
      } else {
        // Create new SLA config if it doesn't exist
        const { data: newConfig, error: insertError } = await supabase
          .from('sla_configs')
          .insert({
            id: configId,
            name: `${ticket.priority.toUpperCase()} Priority SLA`,
            description: `Default SLA for ${ticket.priority} priority tickets`,
            first_response_time: DEFAULT_SLA_CONFIGS[ticket.priority].responseTime,
            resolution_time: DEFAULT_SLA_CONFIGS[ticket.priority].resolutionTime
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to create SLA config:', insertError)
          throw insertError
        }

        slaConfig = newConfig
      }

      // Update ticket with SLA config if not set
      if (!ticket.sla_config) {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ sla_config_id: configId })
          .eq('id', ticketId)

        if (updateError) {
          console.error('Failed to update ticket SLA config:', updateError)
          throw updateError
        }
      }

      // Get SLA pauses
      const { data: slaPauses = [], error: pausesError } = await supabase
        .from('sla_pauses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (pausesError) {
        console.error('Failed to get SLA pauses:', pausesError)
        throw pausesError
      }

      // Calculate SLA state
      const createdAt = new Date(ticket.created_at)
      const now = new Date()

      let totalPausedTime = 0
      let isPaused = false
      let currentPauseStart: Date | null = null

      slaPauses.forEach(pause => {
        if (!pause.resumed_at) {
          isPaused = true
          currentPauseStart = new Date(pause.created_at)
        } else {
          totalPausedTime += new Date(pause.resumed_at).getTime() - new Date(pause.created_at).getTime()
        }
      })

      if (isPaused && currentPauseStart) {
        totalPausedTime += now.getTime() - currentPauseStart.getTime()
      }

      const elapsedTime = now.getTime() - createdAt.getTime() - totalPausedTime
      const breachTime = createdAt.getTime() + (slaConfig.first_response_time * 60 * 1000)
      const remainingTime = breachTime - now.getTime() + totalPausedTime

      return {
        configId,
        config: slaConfig,
        isPaused,
        elapsedTime,
        remainingTime,
        breachTime: new Date(breachTime),
        pauses: slaPauses
      }
    } catch (error) {
      console.error('Error in getTicketSLA:', error)
      throw error
    }
  },

  async pauseSLA(context: ServerContext, ticketId: string, reason: string): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Check if SLA is already paused
      const { data: existingPause, error: checkError } = await supabase
        .from('sla_pauses')
        .select('id')
        .eq('ticket_id', ticketId)
        .is('resumed_at', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Failed to check existing pause:', checkError)
        throw checkError
      }

      if (existingPause) {
        throw new Error('SLA is already paused')
      }

      // Create new pause
      const { error: pauseError } = await supabase
        .from('sla_pauses')
        .insert({
          ticket_id: ticketId,
          reason,
          created_by: user.id,
          created_at: new Date().toISOString()
        })

      if (pauseError) {
        console.error('Failed to pause SLA:', pauseError)
        throw pauseError
      }

      return true
    } catch (error) {
      console.error('Error in pauseSLA:', error)
      throw error
    }
  },

  async resumeSLA(context: ServerContext, ticketId: string): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Find the active pause
      const { data: activePause, error: findError } = await supabase
        .from('sla_pauses')
        .select('id')
        .eq('ticket_id', ticketId)
        .is('resumed_at', null)
        .single()

      if (findError) {
        console.error('Failed to find active pause:', findError)
        throw findError
      }

      if (!activePause) {
        throw new Error('No active SLA pause found')
      }

      // Resume the pause
      const { error: resumeError } = await supabase
        .from('sla_pauses')
        .update({
          resumed_at: new Date().toISOString(),
          resumed_by: user.id
        })
        .eq('id', activePause.id)

      if (resumeError) {
        console.error('Failed to resume SLA:', resumeError)
        throw resumeError
      }

      return true
    } catch (error) {
      console.error('Error in resumeSLA:', error)
      throw error
    }
  }
}