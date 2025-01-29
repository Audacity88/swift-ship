import { BaseAgent } from './base-agent';
import { QuoteAgent } from './quote-agent';
import { DocsAgent } from './docs-agent';

export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map();

  public static getAgent(type: string): BaseAgent {
    if (!this.agents.has(type)) {
      switch (type.toLowerCase()) {
        case 'quote':
          this.agents.set(type, new QuoteAgent());
          break;
        case 'docs':
          this.agents.set(type, new DocsAgent());
          break;
        default:
          throw new Error(`Unknown agent type: ${type}`);
      }
    }
    return this.agents.get(type)!;
  }
} 