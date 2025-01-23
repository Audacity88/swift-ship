import { supabase } from '@/lib/supabase'
import type { Ticket, Agent, TicketSnapshot } from '@/types/ticket'
import { v4 as uuidv4 } from 'uuid'

export const archiveService = {
  async archiveTicket(ticket: Ticket, currentAgent: Agent, reason: string): Promise<Ticket> {
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
        metadata: updatedMetadata
      })
      .eq('id', ticket.id)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to archive ticket')
    }

    // Create snapshot
    await this.createSnapshot(data, currentAgent, 'Archive')

    return data
  },

  async restoreTicket(ticket: Ticket, currentAgent: Agent): Promise<Ticket> {
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
        metadata: updatedMetadata
      })
      .eq('id', ticket.id)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to restore ticket')
    }

    // Create snapshot
    await this.createSnapshot(data, currentAgent, 'Restore')

    return data
  },

  async getTicketSnapshots(ticketId: string): Promise<TicketSnapshot[]> {
    // In code references, snapshots are stored in "ticket_snapshots"
    const { data, error } = await supabase
      .from('ticket_snapshots')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('snapshot_at', { ascending: false })

    if (error) {
      console.error('Failed to load snapshots:', error)
      return []
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      ticketId: s.ticket_id,
      snapshotAt: s.snapshot_at,
      data: s.data,
      reason: s.reason || undefined,
      triggeredBy: s.triggered_by,
    }))
  },

  async restoreSnapshot(ticket: Ticket, snapshotId: string, currentAgent: Agent): Promise<Ticket> {
    // Load snapshot
    const { data: snapData, error: snapError } = await supabase
      .from('ticket_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (snapError || !snapData) {
      throw new Error(snapError?.message || 'Snapshot not found')
    }

    // Use the snapshot data to restore
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update({
        ...snapData.data,
      })
      .eq('id', ticket.id)
      .select()
      .single()

    if (error || !updatedTicket) {
      throw new Error(error?.message || 'Failed to restore snapshot')
    }

    // Optionally create a new snapshot to reflect the restore action
    await this.createSnapshot(updatedTicket, currentAgent, 'Snapshot Restore')

    return updatedTicket
  },

  async createSnapshot(ticketData: any, agent: Agent, reason?: string) {
    await supabase
      .from('ticket_snapshots')
      .insert({
        id: uuidv4(),
        ticket_id: ticketData.id,
        snapshot_at: new Date().toISOString(),
        data: ticketData,
        reason,
        triggered_by: agent.id,
      })
  },
}