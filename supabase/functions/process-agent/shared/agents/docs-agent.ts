import { BaseAgent } from '../base-agent.ts';
import type { AgentContext, AgentResponse } from '../types.ts';
import { agentUtils } from '../utils.ts';

export class DocsAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'docs',
      agentType: 'docs',
      systemMessage: `You are Swift Ship's documentation assistant. Your role is to provide accurate information about Swift Ship's services, policies, and procedures.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship"
2. Base responses on official documentation
3. Provide detailed explanations with relevant links
4. If information is not in docs, direct to support
5. Maintain professional and helpful tone
6. Focus on educating and informing users

AVAILABLE TOPICS:
- Shipping Services & Options
- Service Level Agreements
- Pricing Structure
- Package Guidelines
- Restricted Items
- Insurance & Claims
- Tracking & Delivery
- Payment & Billing
- Account Management
- Contact Information

Remember: Provide accurate, documented information and maintain Swift Ship's brand voice.`
    });
  }

  private async searchDocs(query: string): Promise<string[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      const matches = await this.searchSimilarContent(embedding, 0.7, 5);
      return matches.map(doc => doc.content);
    } catch (error) {
      console.error('Error in vector search:', error);
      return [];
    }
  }

  private formatResponse(docs: string[], query: string): string {
    if (docs.length === 0) {
      return "I don't have specific documentation about that topic. Please contact our support team at support@swiftship.com for more information.";
    }

    // Combine relevant documentation sections and format them nicely
    const formattedDocs = docs.map(doc => {
      // Clean up the document content and format it with markdown
      const cleanContent = doc.trim()
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
        .replace(/#{1,6}\s/g, '**') // Replace markdown headers with bold
        .trim();
      
      return cleanContent;
    });

    return formattedDocs.join('\n\n---\n\n');
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    try {
      const lastMessage = agentUtils.getLastUserMessage(context);
      
      if (!lastMessage) {
        return {
          content: "Hello! I can help you find information about Swift Ship's services and policies. What would you like to know?",
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now()
          }
        };
      }

      // Analyze the query to determine the topic
      const topic = await this.getCompletion([
        {
          role: 'system',
          content: 'Analyze the user query and determine which shipping-related topic they are asking about. Return the most relevant topic from: SERVICES, PRICING, PACKAGING, RESTRICTIONS, INSURANCE, TRACKING, BILLING, ACCOUNT, or OTHER.'
        },
        {
          role: 'user',
          content: lastMessage
        }
      ], 0);

      // Search documentation based on the topic and query
      const docs = await this.searchDocs(lastMessage);

      // Format response based on available documentation
      let response = this.formatResponse(docs, lastMessage);

      // For service-related queries, always include contact information
      if (topic.trim() === 'SERVICES') {
        response += "\n\nFor personalized service recommendations or to get started with a quote, please contact our sales team at sales@swiftship.com.";
      }

      // For pricing queries, direct to quote creation
      if (topic.trim() === 'PRICING') {
        response += "\n\nFor accurate pricing based on your specific needs, please use our quote creation service or contact our sales team.";
      }

      return {
        content: response,
        metadata: {
          agentId: this.config.agentId,
          timestamp: Date.now(),
          topic: topic.trim()
        }
      };
    } catch (error) {
      console.error('Error processing documentation request:', error);
      const errorMessage = agentUtils.createErrorMessage(error as Error, this.config.agentId);
      return {
        content: errorMessage.content,
        metadata: errorMessage.metadata
      };
    }
  }
} 