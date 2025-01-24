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
      // Determine priority based on delivery time
      let priority = 'medium'
      if (data.metadata?.destination?.pickupDate) {
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

      // First, get or create the tags we need
      const getOrCreateTag = async (name: string, color: string) => {
        console.debug(`Getting or creating tag: ${name}`)
        
        // Try to get existing tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', name)
          .single()

        if (existingTag?.id) {
          console.debug(`Found existing tag: ${name}`, existingTag)
          return existingTag.id
        }

        // Create new tag if it doesn't exist
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert({ name, color })
          .select('id')
          .single()

        if (error) {
          console.error(`Error creating tag ${name}:`, error)
          return null
        }

        console.debug(`Created new tag: ${name}`, newTag)
        return newTag?.id
      }

      // Get or create the tags before creating the ticket
      const quoteTagId = await getOrCreateTag('quote', '#6366F1')
      let serviceTagId = null
      if (data.metadata?.selectedService) {
        const serviceColors = {
          express_freight: '#EF4444',
          standard_freight: '#3B82F6',
          eco_freight: '#10B981'
        }
        const serviceName = data.metadata.selectedService
        const serviceColor = serviceColors[serviceName as keyof typeof serviceColors] || '#6B7280'
        serviceTagId = await getOrCreateTag(serviceName, serviceColor)
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

      // Add tags using tagService
      const tagIds = [quoteTagId]
      if (serviceTagId) {
        tagIds.push(serviceTagId)
      }

      console.debug('About to add tags:', {
        tagIds,
        quoteTagId,
        serviceTagId,
        ticketId: ticket.id
      })

      try {
        if (!quoteTagId) {
          console.error('No quote tag ID available')
          return
        }
        
        await tagService.bulkUpdateTicketTags(context, 'add', tagIds.filter(Boolean), [ticket.id])
      } catch (error) {
        console.error('Error adding tags to ticket:', error)
      }

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