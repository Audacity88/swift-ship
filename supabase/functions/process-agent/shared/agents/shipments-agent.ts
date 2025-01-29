import { BaseAgent } from '../base-agent.ts';
import type { AgentContext, AgentResponse } from '../types.ts';
import { agentUtils } from '../utils.ts';

export class ShipmentsAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'shipments',
      agentType: 'shipments',
      systemMessage: `You are Swift Ship's shipments agent. Your role is to assist users with shipment planning, logistics, and delivery scheduling.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When discussing shipping options, always specify "Swift Ship's [service level] shipping"
3. When mentioning delivery times, always say "Swift Ship's estimated delivery time"
4. When discussing shipment planning, always say "Swift Ship's logistics network" or "Swift Ship's delivery routes"
5. Base your responses on the provided documentation when available
6. If information is not in the provided docs, say "I don't have specific documentation about this shipment matter, but as Swift Ship's shipments agent, I recommend..."

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.`
    });
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    try {
      const lastMessage = agentUtils.getLastUserMessage(context);
      
      if (!lastMessage) {
        return {
          content: "I apologize, but I couldn't find your message. Could you please repeat your question about shipments?",
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now()
          }
        };
      }

      // Generate embedding for the query to find similar shipment info
      const embedding = await this.generateEmbedding(lastMessage);
      const similarContent = await this.searchSimilarContent(embedding, 0.7, 3);
      
      // Prepare context from similar content
      const shipmentContext = similarContent.map(item => item.content).join('\n\n');

      // Get completion from OpenAI with context
      const response = await this.getCompletion([
        { 
          role: 'system', 
          content: `Use this additional context about Swift Ship's shipments when relevant:\n${shipmentContext}`
        },
        {
          role: 'user',
          content: lastMessage
        }
      ]);

      return {
        content: response,
        metadata: {
          agentId: this.config.agentId,
          timestamp: Date.now(),
          similarContentFound: similarContent.length > 0
        }
      };
    } catch (error) {
      console.error('ShipmentsAgent error:', error);
      const errorMessage = agentUtils.createErrorMessage(error as Error, this.config.agentId);
      return {
        content: errorMessage.content,
        metadata: errorMessage.metadata
      };
    }
  }
} 