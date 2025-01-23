import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Ticket, Agent, TicketSnapshot } from '@/types/ticket'
import { v4 as uuidv4 } from 'uuid'

export const archiveService = {
  async archiveTicket(context: ServerContext, ticket: Ticket, currentAgent: Agent, reason: string): Promise<Ticket> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Mark ticket as archived
      const updatedMetadata = {
        ...ticket.metadata,
        archivedAt: new Date().toISOString(),
        archivedBy: currentAgent,
        archiveReason: reason,
      }

      const { data, error } = await supabase
        .from('tickets')
        .update({
          is_archived: true,
          metadata: updatedMetadata,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to archive ticket:', error)
        throw new Error(error?.message || 'Failed to archive ticket')
      }

      // Create snapshot
      await this.createSnapshot(context, data, currentAgent, 'Archive')

      return data
    } catch (error) {
      console.error('Error in archiveTicket:', error)
      throw error
    }
  },

  async restoreTicket(context: ServerContext, ticket: Ticket, currentAgent: Agent): Promise<Ticket> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Mark ticket as unarchived
      const updatedMetadata = {
        ...ticket.metadata,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      }

      const { data, error } = await supabase
        .from('tickets')
        .update({
          is_archived: false,
          metadata: updatedMetadata,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to restore ticket:', error)
        throw new Error(error?.message || 'Failed to restore ticket')
      }

      // Create snapshot
      await this.createSnapshot(context, data, currentAgent, 'Restore')

      return data
    } catch (error) {
      console.error('Error in restoreTicket:', error)
      throw error
    }
  },

  async getTicketSnapshots(context: ServerContext, ticketId: string): Promise<TicketSnapshot[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('ticket_snapshots')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('snapshot_at', { ascending: false })

      if (error) {
        console.error('Failed to load snapshots:', error)
        throw error
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        ticketId: s.ticket_id,
        snapshotAt: s.snapshot_at,
        data: s.data,
        reason: s.reason || undefined,
        triggeredBy: s.triggered_by,
      }))
    } catch (error) {
      console.error('Error in getTicketSnapshots:', error)
      throw error
    }
  },

  async restoreSnapshot(context: ServerContext, ticket: Ticket, snapshotId: string, currentAgent: Agent): Promise<Ticket> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Load snapshot
      const { data: snapData, error: snapError } = await supabase
        .from('ticket_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single()

      if (snapError || !snapData) {
        console.error('Failed to load snapshot:', snapError)
        throw new Error(snapError?.message || 'Snapshot not found')
      }

      // Use the snapshot data to restore
      const { data: updatedTicket, error } = await supabase
        .from('tickets')
        .update({
          ...snapData.data,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id)
        .select()
        .single()

      if (error || !updatedTicket) {
        console.error('Failed to restore snapshot:', error)
        throw new Error(error?.message || 'Failed to restore snapshot')
      }

      // Create a new snapshot to reflect the restore action
      await this.createSnapshot(context, updatedTicket, currentAgent, 'Snapshot Restore')

      return updatedTicket
    } catch (error) {
      console.error('Error in restoreSnapshot:', error)
      throw error
    }
  },

  async createSnapshot(context: ServerContext, ticketData: any, agent: Agent, reason?: string) {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('ticket_snapshots')
        .insert({
          id: uuidv4(),
          ticket_id: ticketData.id,
          snapshot_at: new Date().toISOString(),
          data: ticketData,
          reason,
          triggered_by: agent.id,
          created_by: user.id,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to create snapshot:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in createSnapshot:', error)
      throw error
    }
  },
}