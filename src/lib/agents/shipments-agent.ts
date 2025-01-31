import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class ShipmentsAgent extends BaseAgent {
  constructor() {
    super(
      'shipments',
      'shipments',
      `You are Swift Ship's shipments agent. Your role is to assist users with shipment planning, logistics, and delivery scheduling.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When discussing shipping options, always specify "Swift Ship's [service level] shipping"
3. When mentioning delivery times, always say "Swift Ship's estimated delivery time"
4. When discussing shipment planning, always say "Swift Ship's logistics network" or "Swift Ship's delivery routes"
5. Base your responses on the provided documentation when available
6. If information is not in the provided docs, say "I don't have specific documentation about this shipment matter, but as Swift Ship's shipments agent, I recommend..."

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.`
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    const lastMessage = context.messages[context.messages.length - 1];
    
    if (!lastMessage) {
      return this.createMessage(
        "I apologize, but I couldn't find your message. Could you please repeat your question about shipments?"
      );
    }

    // Get completion from OpenAI
    const response = await this.getCompletion(context.messages);
    return this.createMessage(response);
  }
} 