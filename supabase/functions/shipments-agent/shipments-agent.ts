import { OpenAI } from './deps.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { Context, Response, Shipment, ShipmentOperationResult, ShipmentUpdateRequest } from './types.ts';
import { formatShipments, formatStatus } from './formatters.ts';

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
    if (!apiKey) throw new Error('OpenAI API key is required');
    
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL');
    const key = supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!url || !key) throw new Error('Supabase configuration is required');
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
      prompt += `\n\nCustomer's shipments:\n${formatShipments(context.metadata.shipments)}`;
    }

    return prompt;
  }

  private async getShipmentDetails(tracking_number: string): Promise<Shipment | null> {
    try {
      const { data: shipment, error: shipmentError } = await this.supabase
        .from('shipments')
        .select(`
          *,
          shipment_events (*),
          quotes:quote_id (metadata)
        `)
        .ilike('tracking_number', tracking_number)
        .single();

      if (shipmentError) return null;

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

  private async cancelShipment(tracking_number: string, customerId?: string): Promise<ShipmentOperationResult> {
    try {
      // Ensure we're using the service role client
      const serviceRoleClient = this.supabase;

      const { data: shipment, error: fetchError } = await serviceRoleClient
        .from('shipments')
        .select('*')
        .ilike('tracking_number', tracking_number)
        .single();

      if (fetchError || !shipment) {
        throw new Error(`Shipment not found with tracking number ${tracking_number}`);
      }

      if (['delivered', 'cancelled'].includes(shipment.status)) {
        throw new Error(`Cannot cancel shipment in ${shipment.status} status`);
      }

      // Update shipment status to cancelled
      const { data: updatedShipment, error: updateError } = await serviceRoleClient
        .from('shipments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.id)
        .select()
        .single();

      if (updateError) throw updateError;

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

  public async process(context: Context): Promise<Response> {
    try {
      if (!Array.isArray(context.messages) || context.messages.length === 0) {
        throw new Error('Invalid context: messages must be a non-empty array');
      }

      this.initializeOpenAI();
      if (!this.openai) throw new Error('Failed to initialize OpenAI client');

      const lastMessage = context.messages[context.messages.length - 1];
      const content = lastMessage.role === 'user' ? lastMessage.content.toLowerCase() : '';
      let operationResult: ShipmentOperationResult | null = null;

      // Handle shipment queries
      const trackingMatch = content.match(/([A-Za-z]{3}-\d{4}-\d{7})(?:\s+details)?/);
      if (trackingMatch) {
        const shipment = await this.getShipmentDetails(trackingMatch[1]);
        if (shipment) {
          context.metadata = {
            ...context.metadata,
            shipments: [shipment]
          };
        }
      } else if (content.includes('all shipments') || content.includes('my shipments')) {
        const { data: shipments } = await this.supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (shipments) {
          context.metadata = {
            ...context.metadata,
            shipments
          };
        }
      }

      // Handle operations
      const operationMatch = content.match(/(?:tracking(?:\s+number)?[:\s]+)?([A-Za-z]{3}-\d{4}-\d{7})/);
      if (operationMatch) {
        const trackingNumber = operationMatch[1];
        if (content.includes('cancel')) {
          operationResult = await this.cancelShipment(trackingNumber, context.metadata?.customer?.id);
          return {
            content: operationResult.success 
              ? `✅ ${operationResult.message}. The shipment has been cancelled and all relevant parties will be notified.`
              : `❌ ${operationResult.message}. Please try again or contact support if the issue persists.`,
            metadata: {
              operationResult,
              shipments: operationResult.success ? [operationResult.shipment] : undefined
            }
          };
        }
      }

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: this.getSystemPrompt(context) },
          ...context.messages.slice(-2)
        ],
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        stream: true
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
      }

      return {
        content: fullContent,
        metadata: {
          shipments: context.metadata?.shipments,
          operationResult
        }
      };

    } catch (error) {
      console.error('Error processing shipment request:', error);
      return {
        content: 'An error occurred while processing your shipment request. Please try again.',
        metadata: { error: (error as Error).message || 'Unknown error' }
      };
    }
  }
}