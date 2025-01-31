import type { Shipment, ShipmentEvent } from './types.ts';

const STATUS_MAP: Record<string, string> = {
  'quote_requested': '📝 Quote Requested',
  'quote_provided': '💰 Quote Provided',
  'quote_accepted': '✅ Quote Accepted',
  'pickup_scheduled': '📅 Pickup Scheduled',
  'pickup_completed': '🚚 Picked Up',
  'in_transit': '🚛 In Transit',
  'out_for_delivery': '🚚 Out for Delivery',
  'delivered': '✅ Delivered',
  'cancelled': '❌ Cancelled'
};

const TYPE_MAP: Record<string, string> = {
  'full_truckload': '🚛 Full Truckload',
  'less_than_truckload': '🚚 Less Than Truckload',
  'sea_container': '🚢 Sea Container',
  'bulk_freight': '📦 Bulk Freight'
};

export function formatStatus(status: string): string {
  return STATUS_MAP[status] || status;
}

export function formatShipmentType(type: string): string {
  return TYPE_MAP[type] || type;
}

export function formatMetadata(metadata: Record<string, any>): string {
  if (!metadata) return '';

  const lines: string[] = [];
  
  if (metadata.weight) lines.push(`- Weight: ${metadata.weight}`);
  if (metadata.volume) lines.push(`- Volume: ${metadata.volume}`);
  if (metadata.container_size) lines.push(`- Container Size: ${metadata.container_size}`);
  if (metadata.pallet_count) lines.push(`- Pallet Count: ${metadata.pallet_count}`);
  if (metadata.hazardous) lines.push(`- Hazardous Materials: ${metadata.hazardous ? 'Yes ⚠️' : 'No'}`);
  if (metadata.special_requirements) lines.push(`- Special Requirements: ${metadata.special_requirements}`);
  if (metadata.selected_service) lines.push(`- Service Level: ${metadata.selected_service}`);
  if (metadata.quoted_price) lines.push(`- Quoted Price: ${metadata.quoted_price}`);

  return lines.length ? '\nAdditional Details:' + lines.map(line => '\n' + line).join('') : '';
}

export function formatShipmentEvents(events: ShipmentEvent[]): string {
  if (!events?.length) return '';
  
  return '\nShipment History:' + events
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(event => `\n- ${new Date(event.created_at).toLocaleString()}: ${formatStatus(event.status)}${event.location ? ` at ${event.location}` : ''}${event.notes ? ` - ${event.notes}` : ''}`)
    .join('');
}

export function formatShipments(shipments: Shipment[]): string {
  return shipments.map((shipment, index) => {
    // Basic shipment details
    let details = `
Shipment ${index + 1}:
- Tracking Number: ${shipment.tracking_number}
- Status: ${formatStatus(shipment.status)}
- Type: ${formatShipmentType(shipment.type)}
- From: ${shipment.origin}
- To: ${shipment.destination}
- Scheduled Pickup: ${shipment.scheduled_pickup ? new Date(shipment.scheduled_pickup).toLocaleString() : 'Not scheduled'}
- Estimated Delivery: ${shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleString() : 'Not available'}
${shipment.actual_delivery ? `- Delivered: ${new Date(shipment.actual_delivery).toLocaleString()}` : ''}`;

    // Add metadata if available
    if (shipment.metadata && Object.keys(shipment.metadata).length > 0) {
      details += formatMetadata(shipment.metadata);
    }

    // Add events if available
    if (shipment.shipment_events?.length > 0) {
      details += formatShipmentEvents(shipment.shipment_events);
    }

    return details;
  }).join('\n\n');
} 