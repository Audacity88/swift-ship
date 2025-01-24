import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { Shipment, ShipmentEvent, ShipmentStatus, ShipmentType } from '@/types/shipment'
import { generateTrackingNumber } from '@/lib/utils/tracking'
import { SupabaseClient } from '@supabase/supabase-js'

export const shipmentService = {
  async createFromQuote(context: ServerContext, quoteId: string, customerId: string): Promise<Shipment> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
          type: quote.metadata.packageDetails.type,
          status: 'shipment_created',
          origin: quote.metadata.destination.from,
          destination: quote.metadata.destination.to,
          scheduled_pickup: quote.metadata.destination.pickupDate,
          tracking_number: generateTrackingNumber(),
          metadata: {
            weight: quote.metadata.packageDetails.weight,
            volume: quote.metadata.packageDetails.volume,
            container_size: quote.metadata.packageDetails.containerSize,
            pallet_count: quote.metadata.packageDetails.palletCount,
            hazardous: quote.metadata.packageDetails.hazardous,
            special_requirements: quote.metadata.packageDetails.specialRequirements,
            selected_service: quote.metadata.selectedService,
            quoted_price: quote.metadata.quotedPrice
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create shipment:', error)
        throw error
      }

      // Ensure status is set to quote_accepted
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          status: 'shipment_created',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)

      if (updateError) {
        console.error('Failed to update shipment status:', updateError)
        throw updateError
      }

      // Get the updated shipment
      const { data: updatedShipment, error: fetchError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', data.id)
        .single()

      if (fetchError) {
        console.error('Failed to fetch updated shipment:', fetchError)
        throw fetchError
      }

      return updatedShipment
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('shipments')
        .update({ 
          status,
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
            created_by: user.id,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'pickup_scheduled',
          scheduled_pickup: pickupDateTime,
          estimated_delivery: estimatedDelivery,
          updated_by: user.id,
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
  },

  async listShipments(
    context: ServerContext,
    options?: {
      customerId?: string
      status?: ShipmentStatus[]
      type?: ShipmentType
      page?: number
      limit?: number
    }
  ): Promise<{ data: Shipment[], total: number }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const page = options?.page || 1
      const limit = options?.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('shipments')
        .select('*', { count: 'exact' })

      // Apply filters
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId)
      }
      if (options?.status?.length) {
        query = query.in('status', options.status)
      }
      if (options?.type) {
        query = query.eq('type', options.type)
      }

      // Apply pagination
      query = query.range(from, to)
        .order('created_at', { ascending: false })

      const { data, count, error } = await query

      if (error) {
        console.error('Failed to list shipments:', error)
        throw error
      }

      return { 
        data: data || [], 
        total: count || 0 
      }
    } catch (error) {
      console.error('Error in listShipments:', error)
      throw error
    }
  },

  async createShipment(supabase: SupabaseClient, data: {
    quote_id?: string
    type: ShipmentType
    origin: string
    destination: string
    scheduled_pickup?: string
    estimated_delivery?: string
    customer_id: string
    created_by?: string
    status?: string
  }): Promise<Shipment> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Convert empty strings to null for date fields
      const scheduled_pickup = data.scheduled_pickup?.trim() || null
      const estimated_delivery = data.estimated_delivery?.trim() || null

      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert({
          quote_id: data.quote_id,
          customer_id: data.customer_id,
          type: data.type,
          status: data.status || 'shipment_created',
          origin: data.origin,
          destination: data.destination,
          scheduled_pickup,
          estimated_delivery,
          tracking_number: generateTrackingNumber(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create shipment:', error)
        throw error
      }

      return shipment
    } catch (error) {
      console.error('Error in createShipment:', error)
      throw error
    }
  }
} 