import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class RouterAgent extends BaseAgent {
  constructor() {
    super(
      'router',
      'router',
      `You are a router agent responsible for analyzing user queries and determining which specialized agent should handle them.
      Available agents:
      1. DOCS_AGENT - For questions about documentation, how-tos, and general product information
      2. SUPPORT_AGENT - For technical support, troubleshooting, and bug reports
      3. BILLING_AGENT - For questions about pricing, subscriptions, and billing issues
      
      Respond with the name of the most appropriate agent and a brief explanation of why you chose it.
      Format your response as JSON: { "agent": "AGENT_NAME", "reason": "explanation" }`
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    const lastMessage = context.messages[context.messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return this.createMessage(JSON.stringify({
        agent: 'DOCS_AGENT',
        reason: 'No user message found, defaulting to documentation agent'
      }));
    }

    // Get agent recommendation
    const response = await this.getCompletion(
      [lastMessage],
      0 // Use temperature 0 for consistent routing
    );

    try {
      // Validate JSON response
      JSON.parse(response);
      return this.createMessage(response);
    } catch (e) {
      // Fallback if response isn't valid JSON
      return this.createMessage(JSON.stringify({
        agent: 'SUPPORT_AGENT',
        reason: 'Invalid router response, defaulting to support agent'
      }));
    }
  }
} 