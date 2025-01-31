import { BaseAgent } from './base-agent';

export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map();

  public static getAgent(type: string): BaseAgent {
    if (!this.agents.has(type)) {
      const agentType = type.toLowerCase();
      
      // We'll use dynamic imports since the agents are now separate Edge Functions
      switch (agentType) {
        case 'quote':
          // The actual agent instantiation will happen in the Edge Function
          throw new Error('Agents should be accessed via their Edge Function endpoints');
        case 'docs':
          throw new Error('Agents should be accessed via their Edge Function endpoints');
        case 'support':
          throw new Error('Agents should be accessed via their Edge Function endpoints');
        case 'shipments':
          throw new Error('Agents should be accessed via their Edge Function endpoints');
        case 'router':
          throw new Error('Agents should be accessed via their Edge Function endpoints');
        default:
          throw new Error(`Unknown agent type: ${type}`);
      }
    }
    return this.agents.get(type)!;
  }
} 