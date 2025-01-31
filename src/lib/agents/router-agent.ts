import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class RouterAgent extends BaseAgent {
  constructor() {
    super(
      'router',
      'router',
      `You are a router agent responsible for analyzing user queries and determining which specialized agent should handle them.
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
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    console.log('RouterAgent: Processing request with metadata:', {
      agentType: context.metadata?.agentType,
      agent: context.metadata?.agent,
      userId: context.metadata?.userId
    });

    const lastMessage = context.messages[context.messages.length - 1];
    console.log('RouterAgent: Last message:', lastMessage);
    
    // Check both explicit agent type in metadata and top-level agent parameter
    const isQuoteAgent = context.metadata?.agentType === 'quote' || context.metadata?.agent === 'quote';
    console.log('RouterAgent: isQuoteAgent =', isQuoteAgent, {
      metadataAgentType: context.metadata?.agentType,
      metadataAgent: context.metadata?.agent
    });
    
    if (isQuoteAgent) {
      console.log('RouterAgent: Explicitly routing to QUOTE_AGENT via metadata');
      return this.createMessage(JSON.stringify({
        agent: 'QUOTE_AGENT',
        reason: 'Explicitly requested quote agent'
      }));
    }
    
    console.log('RouterAgent: No explicit agent type, performing content-based routing');
    
    if (!lastMessage) {
      console.log('RouterAgent: No message found, defaulting to docs agent');
      return this.createMessage(JSON.stringify({
        agent: 'DOCS_AGENT',
        reason: 'No message found, defaulting to docs agent'
      }));
    }

    // Get agent recommendation
    const response = await this.getCompletion(
      [{
        role: 'user',
        content: typeof lastMessage === 'string' ? lastMessage : lastMessage.content
      }],
      0 // Use temperature 0 for consistent routing
    );

    try {
      // Validate JSON response
      JSON.parse(response);
      return this.createMessage(response);
    } catch (e) {
      // Fallback if response isn't valid JSON
      return this.createMessage(JSON.stringify({
        agent: 'DOCS_AGENT',
        reason: 'Invalid router response, defaulting to docs agent'
      }));
    }
  }
} 