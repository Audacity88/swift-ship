import { OpenAI, Configuration } from './deps.ts';

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface AgentContext {
  messages: AgentMessage[];
  metadata?: {
    userId: string;
    customer: {
      id: string;
      name: string;
      email: string;
    };
    shipments?: Array<{
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
    }>;
  };
}

interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export class ShipmentsAgent {
  private openai: OpenAI;
  private debugLogs: string[] = [];

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    try {
      this.openai = new OpenAI(new Configuration({ apiKey: this.apiKey }));
    } catch (error) {
      this.log('Error initializing OpenAI:', error);
      throw new Error('Failed to initialize OpenAI client');
    }
  }

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  private systemPrompt = `
You are Swift Ship's shipments agent. Your role is to assist users with shipment planning, logistics, and delivery scheduling.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When discussing shipping options, always specify "Swift Ship's [service level] shipping"
3. When mentioning delivery times, always say "Swift Ship's estimated delivery time"
4. When discussing shipment planning, always say "Swift Ship's logistics network" or "Swift Ship's delivery routes"
5. Base your responses on the provided documentation when available
6. If information is not in the provided docs, say "I don't have specific documentation about this shipment matter, but as Swift Ship's shipments agent, I recommend..."
7. When discussing a customer's shipments, use the shipment data provided in the context
8. For tracking queries, check the customer's shipments in the context and provide specific details about their shipments
9. If asked about a specific tracking number, look it up in the customer's shipments and provide detailed status information

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.
`;

  public async process(context: AgentContext): Promise<AgentResponse> {
    if (!this.openai) {
      return {
        content: "I apologize, but I'm currently unable to process requests. Please try again later.",
        metadata: { 
          error: 'OpenAI client not initialized',
          debugLogs: this.debugLogs 
        }
      };
    }

    // Collect the last user message
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) {
      return {
        content: "I apologize, but I couldn't find your message. Could you please repeat your question about shipments?",
        metadata: { debugLogs: this.debugLogs }
      };
    }

    // Build conversation for OpenAI
    const conversation = [
      { role: 'system', content: this.systemPrompt },
      // Add customer shipment data if available
      ...(context.metadata?.shipments ? [{
        role: 'system',
        content: `Current customer shipments:\n${JSON.stringify(context.metadata.shipments, null, 2)}`
      }] : []),
      ...context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Send to OpenAI for a completion
    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-4', // Use stable model
        messages: conversation,
        temperature: 0.7,
        max_tokens: 500
      });
      
      if (!completion.data.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      const content = completion.data.choices[0].message.content;

      return {
        content,
        metadata: {
          debugLogs: this.debugLogs
        }
      };
    } catch (error) {
      this.log('Error calling OpenAI:', error);
      
      // Check for specific error types
      if (error.response?.status === 401) {
        return {
          content: "I'm sorry, but I'm having trouble accessing my knowledge base. Please try again later.",
          metadata: {
            error: 'OpenAI authentication error',
            debugLogs: this.debugLogs
          }
        };
      }
      
      if (error.response?.status === 429) {
        return {
          content: "I'm currently experiencing high demand. Please try again in a moment.",
          metadata: {
            error: 'OpenAI rate limit exceeded',
            debugLogs: this.debugLogs
          }
        };
      }

      return {
        content: "I'm sorry, but I encountered an error processing your request. Please try again later.",
        metadata: {
          error: error.message || 'Unknown error',
          debugLogs: this.debugLogs
        }
      };
    }
  }
}