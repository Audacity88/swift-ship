import { OpenAI, traceable, wrapOpenAI } from './deps.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { Context, Response, Shipment, ShipmentOperationResult, ShipmentUpdateRequest } from './types.ts';
import { formatShipments, formatStatus } from './formatters.ts';

// Ensure LangSmith environment variables are set
const LANGSMITH_TRACING = Deno.env.get("LANGSMITH_TRACING");
const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");

if (!LANGSMITH_API_KEY) {
  console.warn("LANGSMITH_API_KEY is not set. Tracing will not be enabled.");
}

if (!LANGSMITH_TRACING) {
  console.warn("LANGSMITH_TRACING is not set. Tracing will not be enabled.");
}

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

  private initializeOpenAI = traceable(
    async (): Promise<void> => {
      if (!this.openai) {
        this.openai = wrapOpenAI(new OpenAI({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true
        }));
      }
    },
    { name: "initialize_openai" }
  );

  private getSystemPrompt = traceable(
    async (context: Context): Promise<string> => {
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
8. Always confirm the tracking number before any modification
9. ALWAYS provide clickable links when mentioning pages (e.g. [Tracking](/shipments/tracking))
10. Format links as Markdown: [Link Text](/path)`;

      if (context.metadata?.customer) {
        prompt += `\n\nCurrent customer: ${context.metadata.customer.name} (${context.metadata.customer.email})`;
      }

      if (context.metadata?.shipments?.length) {
        prompt += `\n\nCustomer's shipments:\n${formatShipments(context.metadata.shipments)}`;
      }

      return prompt;
    },
    { name: "get_system_prompt" }
  );

  private getShipmentDetails = traceable(
    async (tracking_number: string): Promise<Shipment | null> => {
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
    },
    { name: "get_shipment_details" }
  );

  private cancelShipment = traceable(
    async (tracking_number: string, customerId?: string): Promise<ShipmentOperationResult> => {
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
    },
    { name: "cancel_shipment" }
  );

  public process = traceable(
    async (context: Context): Promise<Response> => {
      try {
        if (!Array.isArray(context.messages) || context.messages.length === 0) {
          throw new Error('Invalid context: messages must be a non-empty array');
        }

        await this.initializeOpenAI();
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

        // Get system prompt with updated context
        const systemPrompt = await this.getSystemPrompt(context);

        // Get completion with GPT-4
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...context.messages
          ],
          temperature: 0.7,
          stream: true
        });

        let fullContent = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
          }
        }

        return {
          content: fullContent,
          metadata: {
            operationResult,
            shipments: context.metadata?.shipments
          }
        };

      } catch (error) {
        console.error('Error in process:', error);
        return {
          content: "I encountered an error while processing your request. Please try again or visit our [Support Center](/support/tickets) for assistance.",
          metadata: { error: (error as Error).message }
        };
      }
    },
    { name: "shipments_agent_process" }
  );
}