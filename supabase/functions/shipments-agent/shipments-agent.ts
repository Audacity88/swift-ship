import { OpenAI, Configuration } from './deps.ts';

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export class ShipmentsAgent {
  private openai: OpenAI;
  private debugLogs: string[] = [];

  constructor(private apiKey: string) {
    this.openai = new OpenAI(new Configuration({ apiKey: this.apiKey }));
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

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.
`;

  public async process(context: AgentContext): Promise<AgentResponse> {
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
      ...context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Send to OpenAI for a completion
    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 500
      });
      const content = completion.data.choices[0].message?.content || '';

      return {
        content,
        metadata: {
          debugLogs: this.debugLogs
        }
      };
    } catch (error) {
      this.log('Error calling OpenAI:', error);
      return {
        content: "I'm sorry, but I encountered an error. Please try again later.",
        metadata: {
          debugLogs: this.debugLogs
        }
      };
    }
  }
}