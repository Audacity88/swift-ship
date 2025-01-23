import { SupabaseClient } from '@supabase/supabase-js'
import { Shipment, ShipmentEvent, ShipmentStatus } from '@/types/shipment'
import { generateTrackingNumber } from '@/lib/utils/tracking'

export class ShipmentService {
  constructor(private supabase: SupabaseClient) {}

  async createFromQuote(quoteId: string, customerId: string): Promise<Shipment> {
    // Get quote details
    const { data: quote, error: quoteError } = await this.supabase
      .from('tickets')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (quoteError) throw quoteError

    // Create shipment
    const { data, error } = await this.supabase
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
        }
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateStatus(
    shipmentId: string, 
    status: ShipmentStatus,
    location?: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('shipments')
      .update({ status })
      .eq('id', shipmentId)

    if (error) throw error

    // Add event with location and notes if provided
    if (location || notes) {
      const { error: eventError } = await this.supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipmentId,
          status,
          location,
          notes
        })

      if (eventError) throw eventError
    }
  }

  async getShipmentWithEvents(shipmentId: string): Promise<Shipment & { events: ShipmentEvent[] }> {
    // Get shipment details
    const { data: shipment, error: shipmentError } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single()

    if (shipmentError) throw shipmentError

    // Get events
    const { data: events, error: eventsError } = await this.supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false })

    if (eventsError) throw eventsError

    return {
      ...shipment,
      events: events
    }
  }

  async getCustomerShipments(customerId: string): Promise<Shipment[]> {
    const { data, error } = await this.supabase
      .from('shipments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async schedulePickup(
    shipmentId: string,
    pickupDateTime: string,
    estimatedDelivery: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('shipments')
      .update({
        status: 'pickup_scheduled',
        scheduled_pickup: pickupDateTime,
        estimated_delivery: estimatedDelivery
      })
      .eq('id', shipmentId)

    if (error) throw error
  }

  async markPickupComplete(
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(shipmentId, 'pickup_completed', location, notes)
  }

  async markInTransit(
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(shipmentId, 'in_transit', location, notes)
  }

  async markOutForDelivery(
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(shipmentId, 'out_for_delivery', location, notes)
  }

  async markDelivered(
    shipmentId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('shipments')
      .update({
        status: 'delivered',
        actual_delivery: new Date().toISOString()
      })
      .eq('id', shipmentId)

    if (error) throw error

    // Add delivery event
    if (location || notes) {
      const { error: eventError } = await this.supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipmentId,
          status: 'delivered',
          location,
          notes
        })

      if (eventError) throw eventError
    }
  }

  async cancelShipment(
    shipmentId: string,
    notes?: string
  ): Promise<void> {
    await this.updateStatus(shipmentId, 'cancelled', undefined, notes)
  }
} 