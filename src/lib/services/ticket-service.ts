import type { Ticket, TicketListItem, TicketStatus, TicketPriority } from '@/types/ticket'
import type { SearchRequest } from '@/types/search'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export interface TicketRelationship {
  related_ticket_id: string
  relationship_type: string
  related_ticket: {
    id: string
    title: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    metadata: Record<string, unknown>
  }
}

// Individual function exports with context
export const fetchTickets = async (
  context: ServerContext,
  options?: {
    filters?: {
      status?: string[]
      priority?: string[]
      search?: string
      dateFrom?: string
      dateTo?: string
    },
    pagination?: {
      page: number
      pageSize: number
    },
    sort?: {
      field: string
      direction: 'asc' | 'desc'
    }
  }
): Promise<{ data: TicketListItem[], total: number }> => {
  return ticketService.fetchTickets(context, options)
}

export const createTicket = async (
  context: ServerContext,
  payload: {
    title: string
    description: string
    priority: TicketPriority
    customerId: string
    assigneeId?: string
    tags?: string[]
    metadata?: Record<string, any>
  }
): Promise<any> => {
  return ticketService.createTicket(context, payload)
}

export const updateTicket = async (
  context: ServerContext,
  ticketId: string,
  updates: Record<string, any>
): Promise<any> => {
  return ticketService.updateTicket(context, ticketId, updates)
}

export const getTicket = async (
  context: ServerContext,
  ticketId: string
): Promise<Ticket | null> => {
  return ticketService.getTicket(context, ticketId)
}

export const updateTicketStatus = async (
  context: ServerContext,
  ticketId: string,
  newStatus: TicketStatus,
  reason?: string
): Promise<void> => {
  return ticketService.updateTicketStatus(context, ticketId, newStatus, reason)
}

// Main service object
export const ticketService = {
  async fetchTickets(
    context: ServerContext,
    options?: {
      filters?: {
        status?: string[]
        priority?: string[]
        search?: string
        dateFrom?: string
        dateTo?: string
      },
      pagination?: {
        page: number
        pageSize: number
      },
      sort?: {
        field: string
        direction: 'asc' | 'desc'
      }
    }
  ): Promise<{ data: TicketListItem[], total: number }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const page = options?.pagination?.page || 1
      const pageSize = options?.pagination?.pageSize || 10
      const sortField = options?.sort?.field === 'createdAt' ? 'created_at' : options?.sort?.field || 'created_at'
      const sortDirection = options?.sort?.direction || 'desc'

      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*),
          assignee:agents!tickets_assignee_id_fkey(*),
          ticket_tags!inner(
            tags(
              id,
              name,
              color
            )
          )
        `, { count: 'exact' })

      // If user is not an admin, only show tickets assigned to them
      if (user.type === 'agent' && user.role !== 'admin') {
        query = query.eq('assignee_id', user.id)
      }

      // Apply filters
      if (options?.filters?.status?.length) {
        query = query.in('status', options.filters.status)
      }
      if (options?.filters?.priority?.length) {
        query = query.in('priority', options.filters.priority)
      }
      if (options?.filters?.search) {
        query = query.ilike('title', `%${options.filters.search}%`)
      }
      if (options?.filters?.dateFrom) {
        query = query.gte('created_at', options.filters.dateFrom)
      }
      if (options?.filters?.dateTo) {
        query = query.lte('created_at', options.filters.dateTo)
      }

      // Sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' })

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) {
        console.error('Failed to fetch tickets:', error)
        throw error
      }

      const result = (data || []).map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        customer: {
          id: ticket.customer?.id || '',
          name: ticket.customer?.name || '',
          email: ticket.customer?.email || ''
        },
        assignee: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email,
          role: ticket.assignee.role
        } : undefined,
        tags: ticket.ticket_tags.map((tt: any) => ({
          id: tt.tags.id,
          name: tt.tags.name,
          color: tt.tags.color || '#666666'
        }))
      })) as TicketListItem[]

      return { data: result, total: count || 0 }
    } catch (error) {
      console.error('Error in fetchTickets:', error)
      throw error
    }
  },

  async createTicket(
    context: ServerContext,
    payload: {
      title: string
      description: string
      priority: TicketPriority
      customerId: string
      assigneeId?: string
      tags?: string[]
      metadata?: Record<string, any>
    }
  ): Promise<any> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // If the user is an agent, automatically assign the ticket to them
      const assigneeId = user.type === 'agent' ? user.id : payload.assigneeId || null
      
      // Only set created_by and updated_by if the user is an agent
      const createdBy = user.type === 'agent' ? user.id : null
      const updatedBy = user.type === 'agent' ? user.id : null

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: payload.title,
          description: payload.description,
          status: 'open',
          priority: payload.priority,
          customer_id: payload.customerId,
          assignee_id: assigneeId,
          metadata: {
            tags: payload.tags || [],
            ...payload.metadata
          },
          type: 'question',
          source: 'web',
          created_by: createdBy,
          updated_by: updatedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to create ticket:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createTicket:', error)
      throw error
    }
  },

  async updateTicket(
    context: ServerContext,
    ticketId: string,
    updates: Record<string, any>
  ): Promise<any> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to update ticket:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateTicket:', error)
      throw error
    }
  },

  async getTicket(
    context: ServerContext,
    ticketId: string
  ): Promise<Ticket | null> {
    try {
      console.log('[Ticket Service] Getting ticket:', ticketId)
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('[Ticket Service] Unauthorized access')
        throw new Error('Unauthorized')
      }

      console.log('[Ticket Service] Fetching ticket data with tags')
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*),
          assignee:agents!tickets_assignee_id_fkey(*),
          ticket_tags!inner(
            tags(
              id,
              name,
              color
            )
          )
        `)
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.error('[Ticket Service] Failed to fetch ticket:', ticketError)
        throw ticketError
      }

      if (!ticketData) {
        console.log('[Ticket Service] No ticket found for ID:', ticketId)
        return null
      }

      console.log('[Ticket Service] Raw ticket data:', {
        id: ticketData.id,
        ticket_tags: ticketData.ticket_tags
      })

      const ticket = {
        id: ticketData.id,
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priority: ticketData.priority,
        type: ticketData.type,
        source: ticketData.source,
        createdAt: ticketData.created_at,
        updatedAt: ticketData.updated_at,
        customerId: ticketData.customer_id,
        customer: {
          id: ticketData.customer.id,
          name: ticketData.customer.name,
          email: ticketData.customer.email
        },
        assignee: ticketData.assignee ? {
          id: ticketData.assignee.id,
          name: ticketData.assignee.name,
          email: ticketData.assignee.email,
          role: ticketData.assignee.role
        } : undefined,
        tags: ticketData.ticket_tags.map((tt: any) => ({
          id: tt.tags.id,
          name: tt.tags.name,
          color: tt.tags.color || '#666666'
        }))
      }

      console.log('[Ticket Service] Transformed ticket data:', {
        id: ticket.id,
        tags: ticket.tags
      })

      return ticket
    } catch (error) {
      console.error('[Ticket Service] Error in getTicket:', error)
      throw error
    }
  },

  async updateTicketStatus(
    context: ServerContext,
    ticketId: string,
    newStatus: TicketStatus,
    reason?: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) {
        console.error('Failed to update ticket status:', error)
        throw error
      }

      // Add status change to history
      const { error: historyError } = await supabase
        .from('ticket_history')
        .insert({
          ticket_id: ticketId,
          field: 'status',
          old_value: null, // We could fetch the old status first if needed
          new_value: newStatus,
          reason,
          created_by: user.id,
          created_at: new Date().toISOString()
        })

      if (historyError) {
        console.error('Failed to add status change to history:', historyError)
        throw historyError
      }
    } catch (error) {
      console.error('Error in updateTicketStatus:', error)
      throw error
    }
  },

  async getLinkedProblems(
    context: ServerContext,
    ticketId: string
  ): Promise<TicketRelationship[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('ticket_relationships')
        .select(`
          related_ticket_id,
          relationship_type,
          related_ticket:tickets!ticket_relationships_related_ticket_id_fkey (
            id,
            title,
            status,
            priority,
            created_at,
            updated_at,
            metadata
          )
        `)
        .eq('ticket_id', ticketId)
        .eq('relationship_type', 'problem')
        .returns<TicketRelationship[]>()

      if (error) {
        console.error('Failed to get linked problems:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getLinkedProblems:', error)
      throw error
    }
  },

  async linkProblem(
    context: ServerContext,
    ticketId: string,
    problemTicketId: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // First check if the problem ticket exists
      const { data: problemTicket, error: problemError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', problemTicketId)
        .single()

      if (problemError || !problemTicket) {
        throw new Error('Problem ticket not found')
      }

      // Check if the relationship already exists
      const { data: existing, error: existingError } = await supabase
        .from('ticket_relationships')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('related_ticket_id', problemTicketId)
        .eq('relationship_type', 'problem')
        .maybeSingle()

      if (existingError) {
        console.error('Failed to check existing relationship:', existingError)
        throw existingError
      }

      if (existing) {
        throw new Error('Relationship already exists')
      }

      // Create the relationship
      const { error } = await supabase
        .from('ticket_relationships')
        .insert({
          ticket_id: ticketId,
          related_ticket_id: problemTicketId,
          relationship_type: 'problem',
          created_by: user.id,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to create relationship:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in linkProblem:', error)
      throw error
    }
  },

  async unlinkProblem(
    context: ServerContext,
    ticketId: string,
    problemTicketId: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('ticket_relationships')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('related_ticket_id', problemTicketId)
        .eq('relationship_type', 'problem')

      if (error) {
        console.error('Failed to delete relationship:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in unlinkProblem:', error)
      throw error
    }
  }
}