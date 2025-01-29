import { BaseAgent } from '../base-agent.ts';
import type { AgentContext, AgentResponse } from '../types.ts';
import { agentUtils } from '../utils.ts';

export class RouterAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'router',
      agentType: 'router',
      systemMessage: `You are a router agent responsible for analyzing user queries and determining which specialized agent should handle them.
      Available agents:
      1. QUOTE_AGENT - For shipping quotes, pricing information, rate calculations, and any mention of creating/managing quotes
      2. SUPPORT_AGENT - For technical support, troubleshooting, billing inquiries, and bug reports
      3. DOCS_AGENT - For documentation and general information queries
      4. SHIPMENTS_AGENT - For questions about shipment planning, logistics, and delivery scheduling
      
      Rules for routing:
      - If the query mentions quotes, pricing, rates, or creating a quote -> QUOTE_AGENT
      - If the query is about technical issues or support -> SUPPORT_AGENT
      - If the query is about shipments or logistics -> SHIPMENTS_AGENT
      - For general information queries -> DOCS_AGENT
      
      Respond with the name of the most appropriate agent and a brief explanation of why you chose it.
      Format your response as JSON: { "agent": "AGENT_NAME", "reason": "explanation" }`
    });
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    try {
      // Check metadata for explicit agent routing
      const isQuoteAgent = context.metadata?.agentType === 'quote' || context.metadata?.agent === 'quote';
      
      if (isQuoteAgent) {
        return {
          content: JSON.stringify({
            agent: 'QUOTE_AGENT',
            reason: 'Explicitly requested quote agent'
          }),
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now(),
            routedAgent: 'QUOTE_AGENT'
          }
        };
      }

      const lastMessage = agentUtils.getLastUserMessage(context);
      
      if (!lastMessage) {
        return {
          content: JSON.stringify({
            agent: 'DOCS_AGENT',
            reason: 'No message found, defaulting to docs agent'
          }),
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now(),
            routedAgent: 'DOCS_AGENT'
          }
        };
      }

      // Get agent recommendation
      const response = await this.getCompletion(
        [{
          role: 'user',
          content: lastMessage
        }],
        0 // Use temperature 0 for consistent routing
      );

      try {
        // Validate JSON response
        const parsedResponse = JSON.parse(response);
        return {
          content: response,
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now(),
            routedAgent: parsedResponse.agent
          }
        };
      } catch (e) {
        // Fallback if response isn't valid JSON
        return {
          content: JSON.stringify({
            agent: 'DOCS_AGENT',
            reason: 'Invalid router response, defaulting to docs agent'
          }),
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now(),
            routedAgent: 'DOCS_AGENT'
          }
        };
      }
    } catch (error) {
      console.error('RouterAgent error:', error);
      const errorMessage = agentUtils.createErrorMessage(error as Error, this.config.agentId);
      return {
        content: errorMessage.content,
        metadata: errorMessage.metadata
      };
    }
  }
} 