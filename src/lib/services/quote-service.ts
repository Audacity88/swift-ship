import type { QuoteRequest } from '@/types/quote'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { getSupabase } from '@/lib/supabase-client'
import { SupabaseClient } from '@supabase/supabase-js'
import { tagService } from './tag-service'

export const quoteService = {
  async fetchQuotes(
    context: ServerContext,
    options?: {
      status?: 'open' | 'in_progress'
      searchTerm?: string
    }
  ): Promise<QuoteRequest[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      let query = supabase
        .from('tickets')
        .select(`
          id,
          title,
          metadata,
          status,
          created_at,
          customer:customers!tickets_customer_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('type', 'task')
        .neq('status', 'closed')

      // If specific status is requested, filter by it
      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter quotes based on search term and metadata
      return (data || [])
        .filter(ticket => {
          if (!options?.searchTerm) return true
          const customerEmail = ticket.customer?.email || ''
          const customerName = ticket.customer?.name || ''
          const searchLower = options.searchTerm.toLowerCase()
          return customerEmail.toLowerCase().includes(searchLower) ||
                 customerName.toLowerCase().includes(searchLower)
        })
        .filter(ticket => {
          const metadata = ticket.metadata || {}
          return metadata.destination && metadata.packageDetails
        }) as QuoteRequest[]
    } catch (error) {
      console.error('Error in fetchQuotes:', error)
      throw error
    }
  },

  async createQuoteRequest(
    context: ServerContext,
    data: {
      title: string
      description: string
      customerId: string
      metadata: any
    }
  ): Promise<QuoteRequest> {
    const supabase = getServerSupabase(context)

    try {
      // Determine priority based on delivery time and shipment type
      let priority = 'medium'
      if (data.metadata?.packageDetails?.type === 'eco-freight') {
        priority = 'low'
      } else if (data.metadata?.destination?.pickupDate) {
        const pickupDate = new Date(data.metadata.destination.pickupDate)
        const today = new Date()
        
        // Set to next day if pickup is tomorrow
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        if (
          pickupDate.getDate() === tomorrow.getDate() &&
          pickupDate.getMonth() === tomorrow.getMonth() &&
          pickupDate.getFullYear() === tomorrow.getFullYear()
        ) {
          priority = 'high'
        }
      }

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          customer_id: data.customerId,
          status: 'open',
          type: 'task',
          priority,
          source: 'web',
          metadata: {
            ...data.metadata,
            isQuote: true
          }
        })
        .select()
        .single()

      if (ticketError) throw ticketError
      if (!ticket) throw new Error('Failed to create ticket')

      // Create initial message for the quote
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticket.id,
          content: `New quote request received for ${data.metadata.packageDetails.type} shipment from ${data.metadata.destination.from.address} to ${data.metadata.destination.to.address}.`,
          author_type: 'agent',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      if (messageError) throw messageError

      // Return the created quote request
      return {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        customer: {
          id: data.customerId,
          name: '', // These will be populated by the UI layer
          email: ''
        },
        metadata: ticket.metadata,
        created_at: ticket.created_at
      }
    } catch (error) {
      console.error('Error in createQuoteRequest:', error)
      throw error
    }
  },

  async submitQuote(
    context: ServerContext,
    quoteId: string,
    price: number
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get current ticket data first
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('metadata')
        .eq('id', quoteId)
        .single()

      if (ticketError) throw ticketError

      // Update ticket status and add quoted price to metadata
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'in_progress',
          metadata: {
            ...ticket.metadata,
            quotedPrice: price
          }
        })
        .eq('id', quoteId)

      if (updateError) throw updateError

      // Add a message to notify the customer
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          ticket_id: quoteId,
          content: `Your quote has been processed. The estimated price for your shipment is $${price}.`,
          author_type: 'agent',
          author_id: user.id
        })

      if (messageError) throw messageError
    } catch (error) {
      console.error('Error in submitQuote:', error)
      throw error
    }
  }
} 