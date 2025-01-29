import { BaseAgent } from '../base-agent.ts';
import type { AgentContext, AgentResponse } from '../types.ts';
import { agentUtils } from '../utils.ts';

export class SupportAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'support',
      agentType: 'technical_support',
      systemMessage: `You are a technical support agent responsible for helping users with issues and troubleshooting.
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
    });
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    try {
      const lastMessage = agentUtils.getLastUserMessage(context);
      
      if (!lastMessage) {
        return {
          content: 'How can I help you with your technical issue?',
          metadata: {
            agentId: this.config.agentId,
            timestamp: Date.now()
          }
        };
      }

      // Generate embedding for the query to find similar issues
      const embedding = await this.generateEmbedding(lastMessage);
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
        {
          role: 'user',
          content: lastMessage
        }
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
        {
          role: 'user',
          content: lastMessage
        }
      ]);

      return {
        content: completion,
        metadata: {
          agentId: this.config.agentId,
          timestamp: Date.now(),
          needsHumanIntervention: shouldCreateTicket,
          similarIssuesFound: similarIssues.length
        }
      };
    } catch (error) {
      console.error('SupportAgent error:', error);
      const errorMessage = agentUtils.createErrorMessage(error as Error, this.config.agentId);
      return {
        content: errorMessage.content,
        metadata: errorMessage.metadata
      };
    }
  }
} 