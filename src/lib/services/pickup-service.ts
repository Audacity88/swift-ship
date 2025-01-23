import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export interface PickupTicket {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  metadata: {
    address: string
    pickupDateTime: string
    packageType: string
    weight: string
    quantity: string
    additionalNotes: string
  }
}

export const pickupService = {
  async getPickups(context: ServerContext): Promise<PickupTicket[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags!inner(
            tags!inner(name)
          )
        `)
        .eq('ticket_tags.tags.name', 'pickup')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting pickups:', error)
      throw error
    }
  },

  async createPickup(
    context: ServerContext,
    data: {
      address: string
      pickupDateTime: string
      packageType: string
      weight: string
      quantity: string
      additionalNotes: string
      customerId: string
    }
  ): Promise<PickupTicket> {
    try {
      const supabase = getServerSupabase(context)

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: 'New Pickup Request',
          description: `Shipment pickup at ${data.address} on ${data.pickupDateTime}`,
          status: 'open',
          priority: 'medium',
          type: 'task',
          customer_id: data.customerId,
          source: 'web',
          metadata: {
            address: data.address,
            pickupDateTime: data.pickupDateTime,
            packageType: data.packageType,
            weight: data.weight,
            quantity: data.quantity,
            additionalNotes: data.additionalNotes
          }
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // Ensure the pickup tag exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('*')
        .eq('name', 'pickup')
        .single()

      let tagId: string
      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag, error: createTagError } = await supabase
          .from('tags')
          .insert({ name: 'pickup', color: '#FFC107' })
          .select()
          .single()

        if (createTagError || !newTag) {
          throw new Error('Failed to create pickup tag')
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
          content: 'Your pickup request has been received!',
          author_type: 'system',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      if (messageError) throw messageError

      return ticket
    } catch (error) {
      console.error('Error creating pickup:', error)
      throw error
    }
  }
} 