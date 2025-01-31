import { OpenAI } from './deps.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Define the types locally since we can't import from outside the edge function
type ShipmentStatus = 
  | 'quote_requested'
  | 'quote_provided'
  | 'quote_accepted'
  | 'pickup_scheduled'
  | 'pickup_completed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

type ShipmentType = 
  | 'full_truckload'
  | 'less_than_truckload'
  | 'sea_container'
  | 'bulk_freight';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface Shipment {
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
}

interface Context {
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

interface Response {
  content: string;
  metadata?: Record<string, any>;
}

interface ShipmentUpdateRequest {
  tracking_number: string;
  updates: Partial<{
    scheduled_pickup: string;
    type: string;
    origin: string;
    destination: string;
  }>;
}

interface ShipmentOperationResult {
  success: boolean;
  message: string;
  shipment?: Shipment;
}

export class ShipmentsAgent {
  private openai: OpenAI | null = null;
  private static instance: ShipmentsAgent | null = null;
  private supabase: any;

  private constructor(
    private apiKey: string,
    private supabaseUrl?: string,
    private supabaseKey?: string
  ) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Initialize Supabase client
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL');
    const key = supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!url || !key) {
      throw new Error('Supabase configuration is required');
    }
    
    this.supabase = createClient(url, key);
  }

  public static getInstance(
    apiKey: string,
    supabaseUrl?: string,
    supabaseKey?: string
  ): ShipmentsAgent {
    if (!ShipmentsAgent.instance) {
      ShipmentsAgent.instance = new ShipmentsAgent(apiKey, supabaseUrl, supabaseKey);
    }
    return ShipmentsAgent.instance;
  }

  private initializeOpenAI(): void {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  private formatShipmentEvents(events: any[]): string {
    if (!events?.length) return '';
    
    return '\nShipment History:' + events
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(event => `\n- ${new Date(event.created_at).toLocaleString()}: ${this.formatStatus(event.status)}${event.location ? ` at ${event.location}` : ''}${event.notes ? ` - ${event.notes}` : ''}`)
      .join('');
  }

  private formatShipments(shipments: Shipment[]): string {
    return shipments.map((shipment, index) => {
      // Basic shipment details
      let details = `
Shipment ${index + 1}:
- Tracking Number: ${shipment.tracking_number}
- Status: ${this.formatStatus(shipment.status)}
- Type: ${this.formatShipmentType(shipment.type)}
- From: ${shipment.origin}
- To: ${shipment.destination}
- Scheduled Pickup: ${shipment.scheduled_pickup ? new Date(shipment.scheduled_pickup).toLocaleString() : 'Not scheduled'}
- Estimated Delivery: ${shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleString() : 'Not available'}
${shipment.actual_delivery ? `- Delivered: ${new Date(shipment.actual_delivery).toLocaleString()}` : ''}`;

      // Add metadata if available
      if (shipment.metadata && Object.keys(shipment.metadata).length > 0) {
        details += this.formatMetadata(shipment.metadata);
      }

      // Add events if available
      if (shipment.shipment_events?.length > 0) {
        details += this.formatShipmentEvents(shipment.shipment_events);
      }

      return details;
    }).join('\n\n');
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
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
    return statusMap[status] || status;
  }

  private formatShipmentType(type: string): string {
    const typeMap: Record<string, string> = {
      'full_truckload': '🚛 Full Truckload',
      'less_than_truckload': '🚚 Less Than Truckload',
      'sea_container': '🚢 Sea Container',
      'bulk_freight': '📦 Bulk Freight'
    };
    return typeMap[type] || type;
  }

  private formatMetadata(metadata: Record<string, any>): string {
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

  private async getShipmentDetails(tracking_number: string): Promise<Shipment | null> {
    try {
      // Get the shipment with events
      const { data: shipment, error: shipmentError } = await this.supabase
        .from('shipments')
        .select(`
          *,
          shipment_events (
            *
          ),
          quotes:quote_id (
            metadata
          )
        `)
        .eq('tracking_number', tracking_number)
        .single();

      if (shipmentError) {
        console.error('Error fetching shipment details:', shipmentError);
        return null;
      }

      // Merge quote metadata if available
      if (shipment.quotes?.metadata) {
        shipment.metadata = {
          ...shipment.metadata,
          ...shipment.quotes.metadata
        };
      }

      return shipment;
    } catch (error) {
      console.error('Error in getShipmentDetails:', error);
      return null;
    }
  }

  private async updateShipment(request: ShipmentUpdateRequest): Promise<ShipmentOperationResult> {
    const { tracking_number, updates } = request;
    
    try {
      // Get the shipment by tracking number
      const { data: shipment, error: fetchError } = await this.supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', tracking_number)
        .single();

      if (fetchError || !shipment) {
        throw new Error(`Shipment not found with tracking number ${tracking_number}`);
      }

      // Prepare updates
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (updates.scheduled_pickup) {
        updateData.scheduled_pickup = updates.scheduled_pickup;
        updateData.status = 'pickup_scheduled' as ShipmentStatus;
      }
      if (updates.type) {
        updateData.type = updates.type as ShipmentType;
      }
      if (updates.origin) {
        updateData.origin = updates.origin;
      }
      if (updates.destination) {
        updateData.destination = updates.destination;
      }

      // Update the shipment
      const { data: updatedShipment, error: updateError } = await this.supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipment.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create an event for the update
      await this.supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipment.id,
          status: updateData.status || shipment.status,
          notes: `Shipment details updated: ${Object.keys(updates).join(', ')}`,
          created_at: new Date().toISOString(),
          created_by: 'system'
        });

      return {
        success: true,
        message: `Successfully updated shipment ${tracking_number}`,
        shipment: updatedShipment
      };
    } catch (error) {
      console.error('Error updating shipment:', error);
      return {
        success: false,
        message: `Failed to update shipment: ${(error as Error).message}`
      };
    }
  }

  private async cancelShipment(tracking_number: string): Promise<ShipmentOperationResult> {
    try {
      // Get the shipment by tracking number
      const { data: shipment, error: fetchError } = await this.supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', tracking_number)
        .single();

      if (fetchError || !shipment) {
        throw new Error(`Shipment not found with tracking number ${tracking_number}`);
      }

      // Check if shipment can be cancelled
      const nonCancellableStatuses = ['delivered', 'cancelled'];
      if (nonCancellableStatuses.includes(shipment.status)) {
        throw new Error(`Cannot cancel shipment in ${shipment.status} status`);
      }

      // Update shipment status to cancelled
      const { data: updatedShipment, error: updateError } = await this.supabase
        .from('shipments')
        .update({
          status: 'cancelled' as ShipmentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create a cancellation event
      await this.supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipment.id,
          status: 'cancelled',
          notes: 'Shipment cancelled by customer',
          created_at: new Date().toISOString(),
          created_by: 'system'
        });

      return {
        success: true,
        message: `Successfully cancelled shipment ${tracking_number}`,
        shipment: updatedShipment
      };
    } catch (error) {
      console.error('Error cancelling shipment:', error);
      return {
        success: false,
        message: `Failed to cancel shipment: ${(error as Error).message}`
      };
    }
  }

  private getSystemPrompt(context: Context): string {
    let prompt = `You are Swift Ship's shipments agent. Your role is to assist users with tracking and managing their shipments.

GUIDELINES:
1. Always refer to our company as "Swift Ship"
2. Be concise and direct in your responses
3. When listing shipments, include tracking numbers and current status
4. Format dates in a user-friendly way
5. Highlight any shipments that need attention (delayed, pending pickup, etc.)
6. You can help users modify shipments by updating:
   - Scheduled pickup time
   - Shipment type
   - Origin address
   - Destination address
7. You can also help users cancel their shipments
8. Always confirm the tracking number before any modification`;

    if (context.metadata?.customer) {
      prompt += `\n\nCurrent customer: ${context.metadata.customer.name} (${context.metadata.customer.email})`;
    }

    if (context.metadata?.shipments?.length) {
      prompt += `\n\nCustomer's shipments:\n${this.formatShipments(context.metadata.shipments)}`;
    }

    return prompt;
  }

  public async process(context: Context): Promise<Response> {
    try {
      if (!Array.isArray(context.messages) || context.messages.length === 0) {
        throw new Error('Invalid context: messages must be a non-empty array');
      }

      this.initializeOpenAI();
      if (!this.openai) {
        throw new Error('Failed to initialize OpenAI client');
      }

      const lastMessage = context.messages[context.messages.length - 1];
      let operationResult: ShipmentOperationResult | null = null;

      // Check for shipment details request
      if (lastMessage.role === 'user') {
        const content = lastMessage.content.toLowerCase();
        
        // Check for specific tracking number details request
        const detailsMatch = content.match(/([A-Za-z]{3}-\d{4}-\d{7})(?:\s+details)?/);
        if (detailsMatch) {
          const shipment = await this.getShipmentDetails(detailsMatch[1]);
          if (shipment) {
            context.metadata = {
              ...context.metadata,
              shipments: [shipment]
            };
          }
        }
        // Check for all shipments request
        else if (content.includes('all shipments') || content.includes('my shipments')) {
          const { data: shipments, error } = await this.supabase
            .from('shipments')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!error && shipments) {
            context.metadata = {
              ...context.metadata,
              shipments
            };
          }
        }
      }

      // Check if the message contains operation commands
      if (lastMessage.role === 'user') {
        const content = lastMessage.content.toLowerCase();
        
        // Extract tracking number using regex
        const trackingMatch = content.match(/tracking(?:\s+number)?[:\s]+([A-Za-z0-9-]+)/);
        const trackingNumber = trackingMatch?.[1];

        if (trackingNumber) {
          if (content.includes('cancel')) {
            operationResult = await this.cancelShipment(trackingNumber);
          } else if (content.includes('update') || content.includes('change') || content.includes('modify')) {
            const updates: ShipmentUpdateRequest['updates'] = {};
            
            // Extract potential updates
            if (content.includes('pickup')) {
              const dateMatch = content.match(/pickup[:\s]+([A-Za-z0-9\s,]+)/);
              if (dateMatch) updates.scheduled_pickup = dateMatch[1];
            }
            if (content.includes('type')) {
              const typeMatch = content.match(/type[:\s]+([A-Za-z-]+)/);
              if (typeMatch) updates.type = typeMatch[1];
            }
            if (content.includes('from')) {
              const originMatch = content.match(/from[:\s]+([^to\n]+)/);
              if (originMatch) updates.origin = originMatch[1].trim();
            }
            if (content.includes('to')) {
              const destMatch = content.match(/to[:\s]+([^from\n]+)/);
              if (destMatch) updates.destination = destMatch[1].trim();
            }

            if (Object.keys(updates).length > 0) {
              operationResult = await this.updateShipment({ tracking_number: trackingNumber, updates });
            }
          }
        }
      }

      const conversation = [
        { role: 'system' as const, content: this.getSystemPrompt(context) },
        ...context.messages.slice(-2)
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      
      return {
        content: completion.choices[0]?.message?.content || 'Unable to process request',
        metadata: {
          usage: completion.usage,
          shipments: context.metadata?.shipments,
          operationResult
        }
      };

    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: 'An error occurred while processing your shipment request. Please try again.',
        metadata: { 
          error: err.message || 'Unknown error'
        }
      };
    }
  }
}