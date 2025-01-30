import { OpenAI } from './deps.ts';

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

export class ShipmentsAgent {
  private openai: OpenAI | null = null;
  private static instance: ShipmentsAgent | null = null;

  private constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  public static getInstance(apiKey: string): ShipmentsAgent {
    if (!ShipmentsAgent.instance) {
      ShipmentsAgent.instance = new ShipmentsAgent(apiKey);
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

  private formatShipments(shipments: Shipment[]): string {
    return shipments.map((shipment, index) => `
Shipment ${index + 1}:
- Tracking Number: ${shipment.tracking_number}
- Status: ${shipment.status}
- Type: ${shipment.type}
- From: ${shipment.origin}
- To: ${shipment.destination}
- Scheduled Pickup: ${shipment.scheduled_pickup || 'Not scheduled'}
- Estimated Delivery: ${shipment.estimated_delivery || 'Not available'}
${shipment.actual_delivery ? `- Delivered: ${shipment.actual_delivery}` : ''}`
    ).join('\n\n');
  }

  private getSystemPrompt(context: Context): string {
    let prompt = `You are Swift Ship's shipments agent. Your role is to assist users with tracking and managing their shipments.

GUIDELINES:
1. Always refer to our company as "Swift Ship"
2. Be concise and direct in your responses
3. When listing shipments, include tracking numbers and current status
4. Format dates in a user-friendly way
5. Highlight any shipments that need attention (delayed, pending pickup, etc.)`;

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

      const conversation = [
        { role: 'system' as const, content: this.getSystemPrompt(context) },
        ...context.messages.slice(-2)
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 500, // Increased for shipment details
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      
      return {
        content: completion.choices[0]?.message?.content || 'Unable to process request',
        metadata: {
          usage: completion.usage,
          shipments: context.metadata?.shipments
        }
      };

    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: 'An error occurred while retrieving your shipment information. Please try again.',
        metadata: { 
          error: err.message || 'Unknown error'
        }
      };
    }
  }
}