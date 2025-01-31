export type ShipmentStatus = 
  | 'quote_requested'
  | 'quote_provided'
  | 'quote_accepted'
  | 'pickup_scheduled'
  | 'pickup_completed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type ShipmentType = 
  | 'full_truckload'
  | 'less_than_truckload'
  | 'sea_container'
  | 'bulk_freight';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface Shipment {
  id: string;
  status: string;
  type: string;
  origin: string;
  destination: string;
  tracking_number: string;
  scheduled_pickup?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  metadata: Record<string, any>;
  shipment_events?: ShipmentEvent[];
  quotes?: {
    metadata: Record<string, any>;
  };
}

export interface ShipmentEvent {
  created_at: string;
  status: string;
  location?: string;
  notes?: string;
}

export interface Context {
  messages: Message[];
  metadata?: {
    userId?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
    shipments?: Shipment[];
  };
}

export interface Response {
  content: string;
  metadata?: Record<string, any>;
}

export interface ShipmentUpdateRequest {
  tracking_number: string;
  updates: Partial<{
    scheduled_pickup: string;
    type: string;
    origin: string;
    destination: string;
  }>;
}

export interface ShipmentOperationResult {
  success: boolean;
  message: string;
  shipment?: Shipment;
} 