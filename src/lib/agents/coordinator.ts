import { AgentContext, AgentMessage } from './base-agent';
import { RouterAgent } from './router-agent';
import { QuoteAgent } from './quote-agent';
import { SupportAgent } from './support-agent';
import { ShipmentsAgent } from './shipments-agent';

interface AgentResponse {
  message: AgentMessage;
  nextAgent?: string;
}

export class AgentCoordinator {
  private agents: Map<string, any>;
  private routerAgent: RouterAgent;

  constructor() {
    this.routerAgent = new RouterAgent();
    this.agents = new Map([
      ['QUOTE_AGENT', new QuoteAgent()],
      ['SUPPORT_AGENT', new SupportAgent()],
      ['SHIPMENTS_AGENT', new ShipmentsAgent()]
    ]);
  }

  public async processMessage(message: string, context: AgentContext = { messages: [] }): Promise<AgentResponse> {
    // Add user message to context
    const userMessage: AgentMessage = {
      role: 'user',
      content: message,
      metadata: {
        agentId: 'user',
        timestamp: Date.now()
      }
    };
    
    const updatedContext = {
      ...context,
      messages: [...context.messages, userMessage]
    };

    // Get routing decision
    const routingResponse = await this.routerAgent.process(updatedContext);
    let routingDecision;
    
    try {
      routingDecision = JSON.parse(routingResponse.content);
    } catch (e) {
      routingDecision = { agent: 'QUOTE_AGENT', reason: 'Default routing' };
    }

    // Get the appropriate agent
    const agent = this.agents.get(routingDecision.agent);
    if (!agent) {
      return {
        message: {
          role: 'assistant',
          content: 'I apologize, but I cannot process your request at the moment. The appropriate agent is not available.',
          metadata: {
            agentId: 'coordinator',
            timestamp: Date.now()
          }
        }
      };
    }

    // Process with the selected agent
    const agentResponse = await agent.process(updatedContext);

    return {
      message: agentResponse,
      nextAgent: routingDecision.agent
    };
  }
} 