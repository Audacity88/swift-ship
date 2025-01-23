import type { Ticket, TicketStatus, TicketComment } from '@/types/ticket'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

interface CreateTicketData {
  description: string
  title?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface TicketListParams {
  status?: TicketStatus
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

interface TicketListResponse {
  tickets: Ticket[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const customerTicketService = {
  async createTicket(context: ServerContext, data: CreateTicketData): Promise<Ticket> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get customer name
      const { data: customer, error: customerError } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()

      if (customerError) throw customerError

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          title: data.title || `Support Request from ${customer?.name || 'Customer'}`,
          description: data.description,
          status: 'open',
          priority: data.priority || 'medium',
          customer_id: user.id,
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      if (!ticket) throw new Error('Failed to create ticket')

      return ticket
    } catch (error) {
      console.error('Error in createTicket:', error)
      throw error
    }
  },

  async getCustomerTickets(context: ServerContext, params: TicketListParams = {}): Promise<TicketListResponse> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const {
        status,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params

      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('customer_id', user.id)

      if (status) {
        query = query.eq('status', status)
      }

      // Add sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Add pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        tickets: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    } catch (error) {
      console.error('Error in getCustomerTickets:', error)
      throw error
    }
  },

  async addComment(context: ServerContext, ticketId: string, content: string): Promise<TicketComment> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // First verify the ticket belongs to the customer
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('customer_id', user.id)
        .single()

      if (ticketError || !ticket) {
        throw new Error('Ticket not found or access denied')
      }

      const { data: comment, error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          content,
          author_id: user.id,
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      if (!comment) throw new Error('Failed to add comment')

      return comment
    } catch (error) {
      console.error('Error in addComment:', error)
      throw error
    }
  },

  async getTicketComments(context: ServerContext, ticketId: string): Promise<TicketComment[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // First verify the ticket belongs to the customer
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('customer_id', user.id)
        .single()

      if (ticketError || !ticket) {
        throw new Error('Ticket not found or access denied')
      }

      const { data, error } = await supabase
        .from('ticket_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          author:author_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error in getTicketComments:', error)
      throw error
    }
  }
} 