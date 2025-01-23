import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { Shipment, ShipmentEvent, ShipmentStatus } from '@/types/shipment'
import { generateTrackingNumber } from '@/lib/utils/tracking'

export const shipmentService = {
  async createFromQuote(context: ServerContext, quoteId: string, customerId: string): Promise<Shipment> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // Get quote details
      const { data: quote, error: quoteError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', quoteId)
        .single()

      if (quoteError) {
        console.error('Failed to get quote:', quoteError)
        throw quoteError
      }

      // Create shipment
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          quote_id: quoteId,
          customer_id: customerId,
          type: quote.metadata.type,
          status: 'quote_requested',
          origin: quote.metadata.origin,
          destination: quote.metadata.destination,
          tracking_number: generateTrackingNumber(),
          metadata: {
            weight: quote.metadata.weight,
            volume: quote.metadata.volume,
            container_size: quote.metadata.containerSize,
            pallet_count: quote.metadata.palletCount,
            hazardous: quote.metadata.hazardous,
            special_requirements: quote.metadata.specialRequirements
          },
          created_by: session.user.id,
          updated_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create shipment:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createFromQuote:', error)
      throw error
    }
  },

  async updateStatus(
    context: ServerContext,
    shipmentId: string, 
    status: ShipmentStatus,
    location?: string,
    notes?: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('shipments')
        .update({ 
          status,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)

      if (error) {
        console.error('Failed to update shipment status:', error)
        throw error
      }

      // Add event with location and notes if provided
      if (location || notes) {
        const { error: eventError } = await supabase
          .from('shipment_events')
          .insert({
            shipment_id: shipmentId,
            status,
            location,
            notes,
            created_by: session.user.id,
            created_at: new Date().toISOString()
          })

        if (eventError) {
          console.error('Failed to create shipment event:', eventError)
          throw eventError
        }
      }
    } catch (error) {
      console.error('Error in updateStatus:', error)
      throw error
    }
  },

  async getShipmentWithEvents(context: ServerContext, shipmentId: string): Promise<Shipment & { events: ShipmentEvent[] }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // Get shipment details
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single()

      if (shipmentError) {
        console.error('Failed to get shipment:', shipmentError)
        throw shipmentError
      }

      // Get events
      const { data: events, error: eventsError } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false })

      if (eventsError) {
        console.error('Failed to get shipment events:', eventsError)
        throw eventsError
      }

      return {
        ...shipment,
        events: events
      }
    } catch (error) {
      console.error('Error in getShipmentWithEvents:', error)
      throw error
    }
  },

  async getCustomerShipments(context: ServerContext, customerId: string): Promise<Shipment[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get customer shipments:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getCustomerShipments:', error)
      throw error
    }
  },

  async schedulePickup(
    context: ServerContext,
    shipmentId: string,
    pickupDateTime: string,
    estimatedDelivery: string
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'pickup_scheduled',
          scheduled_pickup: pickupDateTime,
          estimated_delivery: estimatedDelivery,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)

      if (error) {
        console.error('Failed to schedule pickup:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in schedulePickup:', error)
      throw error
    }
  },

  async markPickupComplete(
    context: ServerContext,
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(context, shipmentId, 'pickup_completed', location, notes)
  },

  async markInTransit(
    context: ServerContext,
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(context, shipmentId, 'in_transit', location, notes)
  },

  async markOutForDelivery(
    context: ServerContext,
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(context, shipmentId, 'out_for_delivery', location, notes)
  },

  async markDelivered(
    context: ServerContext,
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(context, shipmentId, 'delivered', location, notes)
  },

  async cancelShipment(
    context: ServerContext,
    shipmentId: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(context, shipmentId, 'cancelled', undefined, notes)
  }
} 