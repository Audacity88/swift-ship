import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class SupportAgent extends BaseAgent {
  constructor() {
    super(
      'support',
      'technical_support',
      `You are a technical support agent responsible for helping users with issues and troubleshooting.
      Your goals:
      1. Diagnose technical issues accurately
      2. Provide step-by-step solutions
      3. Create support tickets when necessary
      4. Follow up on complex issues
      5. Collect relevant technical details
      
      When appropriate, ask for:
      - Error messages
      - System information
      - Steps to reproduce
      - Recent changes made
      
      If the issue requires human intervention, recommend creating a ticket.`
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    const lastMessage = context.messages[context.messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return this.createMessage('How can I help you with your technical issue?');
    }

    // Generate embedding for the query to find similar issues
    const embedding = await this.generateEmbedding(lastMessage.content);
    const similarIssues = await this.searchSimilarContent(embedding, 0.7, 2);
    
    // Prepare context from similar issues
    const issuesContext = similarIssues.map(issue => {
      const metadata = issue.metadata as { title?: string; resolution?: string };
      return `
Similar Issue: ${metadata.title || 'Untitled'}
Resolution: ${metadata.resolution || 'Not available'}
Details: ${issue.content}
---`;
    }).join('\n');

    // Analyze if this needs human intervention
    const needsHuman = await this.getCompletion([
      {
        role: 'system',
        content: 'Analyze if this issue requires human support. Respond with only "true" or "false".'
      },
      lastMessage
    ], 0);

    const shouldCreateTicket = needsHuman.toLowerCase().includes('true');

    // Get support response
    const completion = await this.getCompletion([
      { 
        role: 'system', 
        content: `Similar issues and resolutions:\n${issuesContext}\n${
          shouldCreateTicket 
            ? 'This issue requires human intervention. Collect necessary information and recommend creating a ticket.'
            : 'Try to resolve this issue using available information.'
        }`
      },
      lastMessage
    ]);

    return this.createMessage(completion);
  }
} 