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
        .select('*, customer:customers(*), assignee:agents!tickets_assignee_id_fkey(*)', { count: 'exact' })

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
        tags: ticket.metadata?.tags || [],
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

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: payload.title,
          description: payload.description,
          status: 'open',
          priority: payload.priority,
          customer_id: payload.customerId,
          assignee_id: payload.assigneeId || null,
          metadata: {
            tags: payload.tags || [],
            ...payload.metadata
          },
          type: 'question',
          source: 'web',
          created_by: user.id,
          updated_by: user.id,
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

  async getTicket(context: ServerContext, ticketId: string): Promise<Ticket | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      if (!ticketId || ticketId === 'undefined') {
        throw new Error('Invalid ticket ID: ID is undefined')
      }

      // Validate UUID format using regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(ticketId)) {
        throw new Error(`Invalid ticket ID format: ${ticketId}`)
      }

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customers(*),
          assignee:agents!tickets_assignee_id_fkey(*),
          messages (
            id,
            content,
            author_type,
            author_id,
            created_at,
            updated_at
          )
        `)
        .eq('id', ticketId)
        .single()

      if (error || !data) {
        console.error('Failed to get ticket:', error)
        throw error
      }

      // Fetch author details for messages
      const messageIds = data.messages.map((m: any) => m.author_id)
      const { data: authorData } = await supabase
        .from('message_authors')
        .select('*')
        .in('author_id', messageIds)

      // Create a map of author details by ID
      const authorMap = new Map(authorData?.map((author: any) => [author.author_id, author]) || [])

      const result: Ticket = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        type: data.type,
        isArchived: data.is_archived,
        metadata: data.metadata || {
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          tags: [],
          customFields: {}
        },
        customerId: data.customer_id,
        assigneeId: data.assignee_id || undefined,
        customer: data.customer
          ? {
              id: data.customer.id,
              name: data.customer.name,
              email: data.customer.email,
              role: 'customer',
              isActive: true,
              createdAt: data.customer.created_at,
              updatedAt: data.customer.updated_at,
            }
          : {
              id: '',
              name: '',
              email: '',
              role: 'customer',
              isActive: true,
              createdAt: '',
              updatedAt: '',
            },
        assignee: data.assignee
          ? {
              id: data.assignee.id,
              name: data.assignee.name,
              email: data.assignee.email,
              role: data.assignee.role,
              isActive: true,
              createdAt: data.assignee.created_at,
              updatedAt: data.assignee.updated_at
            }
          : undefined,
        comments: data.messages.map((message: any) => {
          const author = authorMap.get(message.author_id)
          return {
            id: message.id,
            content: message.content,
            createdAt: message.created_at,
            updatedAt: message.updated_at,
            author: author ? {
              id: author.author_id,
              name: author.name,
              email: author.email,
              type: author.author_type
            } : undefined
          }
        }),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        resolvedAt: data.resolved_at || undefined,
      }

      return result
    } catch (error) {
      console.error('Error in getTicket:', error)
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