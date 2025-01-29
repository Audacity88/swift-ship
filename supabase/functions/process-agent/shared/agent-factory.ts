import { QuoteAgent } from './agents/quote-agent.ts';
import { RouterAgent } from './agents/router-agent.ts';
import { DocsAgent } from './agents/docs-agent.ts';
import { SupportAgent } from './agents/support-agent.ts';
import { ShipmentsAgent } from './agents/shipments-agent.ts';
import type { BaseAgent } from './base-agent.ts';

export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map();

  static getAgent(type: string): BaseAgent {
    const agentType = type.toLowerCase();
    
    if (!this.agents.has(agentType)) {
      switch (agentType) {
        case 'quote':
          this.agents.set(agentType, new QuoteAgent());
          break;
        case 'router':
          this.agents.set(agentType, new RouterAgent());
          break;
        case 'docs':
          this.agents.set(agentType, new DocsAgent());
          break;
        case 'support':
          this.agents.set(agentType, new SupportAgent());
          break;
        case 'shipments':
          this.agents.set(agentType, new ShipmentsAgent());
          break;
        default:
          this.agents.set(agentType, new RouterAgent());
      }
    }

    return this.agents.get(agentType)!;
  }
} 