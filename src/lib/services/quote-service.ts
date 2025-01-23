import type { QuoteRequest } from '@/types/quote'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

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

      const { data, error } = await supabase
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
        .eq('status', options?.status || 'open')

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
    try {
      const supabase = getServerSupabase(context)
      
      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          priority: 'medium',
          type: 'task',
          customer_id: data.customerId,
          source: 'web',
          metadata: data.metadata,
          status: 'open'
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // Ensure the quote tag exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('*')
        .eq('name', 'quote')
        .single()

      let tagId: string
      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag, error: createTagError } = await supabase
          .from('tags')
          .insert({ name: 'quote', color: '#FF5722' })
          .select()
          .single()

        if (createTagError || !newTag) {
          throw new Error('Failed to create quote tag')
        }
        tagId = newTag.id
      }

      // Add the tag to the ticket
      const { error: tagError } = await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticket.id,
          tag_id: tagId
        })

      if (tagError) throw tagError

      // Add initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticket.id,
          content: 'Your quote request has been received! We will process it shortly.',
          author_type: 'system',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      if (messageError) throw messageError

      return ticket as QuoteRequest
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

      // Update ticket status and add quoted price to metadata
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'in_progress',
          metadata: {
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