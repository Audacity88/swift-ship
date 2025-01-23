export type ShipmentStatus = 
  | 'quote_requested'    // Initial quote request created
  | 'quote_provided'     // Quote has been provided by the team
  | 'quote_accepted'     // Customer has accepted the quote
  | 'pickup_scheduled'   // Pickup has been scheduled
  | 'pickup_completed'   // Cargo has been picked up
  | 'in_transit'         // Shipment is in transit
  | 'out_for_delivery'   // Final delivery stage
  | 'delivered'          // Successfully delivered
  | 'cancelled'          // Cancelled at any stage

export type ShipmentType = 
  | 'full_truckload'
  | 'less_than_truckload'
  | 'sea_container'
  | 'bulk_freight'

export interface ShipmentEvent {
  id: string
  shipment_id: string
  status: ShipmentStatus
  location?: string
  notes?: string
  created_at: string
  created_by: string
}

export interface Shipment {
  id: string
  quote_id?: string          // Reference to the quote if started with quote
  customer_id: string
  type: ShipmentType
  status: ShipmentStatus
  origin: string
  destination: string
  scheduled_pickup?: string
  estimated_delivery?: string
  actual_delivery?: string
  tracking_number: string
  metadata: {
    weight?: string
    volume?: string
    container_size?: string
    pallet_count?: string
    hazardous: boolean
    special_requirements?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface ShipmentWithEvents extends Shipment {
  events: ShipmentEvent[]
} 