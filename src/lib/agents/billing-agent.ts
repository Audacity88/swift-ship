import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class BillingAgent extends BaseAgent {
  constructor() {
    super(
      'billing',
      'billing_specialist',
      `You are a billing specialist responsible for handling pricing, subscription, and payment queries.
      Your goals:
      1. Answer pricing and plan questions
      2. Help with billing issues
      3. Explain subscription features
      4. Guide through payment processes
      5. Handle upgrade/downgrade requests
      
      Always:
      - Be clear about pricing
      - Explain billing cycles
      - Detail feature limitations
      - Provide relevant plan comparisons
      - Escalate sensitive payment issues
      
      Never:
      - Share specific customer billing details
      - Process payments directly
      - Modify subscription status`
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    const lastMessage = context.messages[context.messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return this.createMessage('How can I help you with billing or subscription questions?');
    }

    // Find relevant billing documentation
    const embedding = await this.generateEmbedding(lastMessage.content);
    const billingDocs = await this.searchSimilarContent(embedding, 0.7, 2);
    
    // Prepare billing context
    const billingContext = billingDocs.map(doc => {
      const metadata = doc.metadata as { 
        title?: string;
        planName?: string;
        pricing?: string;
      };
      return `
Topic: ${metadata.title || 'Billing Information'}
Plan: ${metadata.planName || 'N/A'}
Pricing: ${metadata.pricing || 'See documentation'}
Details: ${doc.content}
---`;
    }).join('\n');

    // Check if this needs escalation
    const needsEscalation = await this.getCompletion([
      {
        role: 'system',
        content: 'Analyze if this billing issue requires human support. Respond with only "true" or "false".'
      },
      lastMessage
    ], 0);

    const shouldEscalate = needsEscalation.toLowerCase().includes('true');

    // Get billing response
    const completion = await this.getCompletion([
      { 
        role: 'system', 
        content: `Relevant billing information:\n${billingContext}\n${
          shouldEscalate 
            ? 'This requires attention from our billing team. Collect necessary information and recommend contacting support.'
            : 'Provide information based on our documentation and general billing policies.'
        }`
      },
      lastMessage
    ]);

    return this.createMessage(completion);
  }
} 