import { supabase } from '@/lib/supabase'
import type { Ticket, TicketListItem, TicketStatus, TicketPriority } from '@/types/ticket'
import type { SearchRequest } from '@/types/search'

// Individual function exports
export const fetchTickets = async (options?: {
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
}): Promise<{ data: TicketListItem[], total: number }> => {
  return ticketService.fetchTickets(options)
}

export const createTicket = async (payload: {
  title: string
  description: string
  priority: TicketPriority
  customerId: string
  assigneeId?: string
  tags?: string[]
  metadata?: Record<string, any>
}): Promise<any> => {
  return ticketService.createTicket(payload)
}

export const updateTicket = async (ticketId: string, updates: Record<string, any>): Promise<any> => {
  return ticketService.updateTicket(ticketId, updates)
}

export const getTicket = async (ticketId: string): Promise<Ticket | null> => {
  return ticketService.getTicket(ticketId)
}

export const updateTicketStatus = async (ticketId: string, newStatus: TicketStatus, reason?: string): Promise<void> => {
  return ticketService.updateTicketStatus(ticketId, newStatus, reason)
}

// Main service object
export const ticketService = {
  // Used in TicketList, SearchTicketsPage, etc.
  async fetchTickets(options?: {
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
  }): Promise<{ data: TicketListItem[], total: number }> {
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
      return { data: [], total: 0 }
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
  },

  async createTicket(payload: {
    title: string
    description: string
    priority: TicketPriority
    customerId: string
    assigneeId?: string
    tags?: string[]
    metadata?: Record<string, any>
  }): Promise<any> {
    // Insert ticket
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
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create ticket:', error)
      throw new Error(error?.message || 'Failed to create ticket')
    }

    return data
  },

  async updateTicket(ticketId: string, updates: Record<string, any>): Promise<any> {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to update ticket:', error)
      throw new Error(error?.message || 'Failed to update ticket')
    }

    return data
  },

  async getTicket(ticketId: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assignee:agents!tickets_assignee_id_fkey(*)
      `)
      .eq('id', ticketId)
      .single()

    if (error || !data) {
      console.error('Failed to get ticket:', error)
      return null
    }

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
      comments: [], // We rely on /comments API or messages table
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      resolvedAt: data.resolved_at || undefined,
    }

    return result
  },

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus, reason?: string): Promise<void> {
    try {
      await this.updateTicket(ticketId, { status: newStatus })
      // Optionally store reason in an audit log
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      throw error
    }
  },
}