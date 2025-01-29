import type { AgentMessage, AgentContext } from './types.ts';

export const agentUtils = {
  /**
   * Extract the last user message from the context
   */
  getLastUserMessage(context: AgentContext): string {
    const lastUserMessage = context.messages
      .filter(m => m.role === 'user')
      .pop();
    return typeof lastUserMessage === 'string' ? lastUserMessage : lastUserMessage?.content || '';
  },

  /**
   * Create a standardized error message
   */
  createErrorMessage(error: Error | string, agentId: string): AgentMessage {
    return {
      role: 'assistant',
      content: typeof error === 'string' ? error : error.message,
      metadata: {
        agentId,
        timestamp: Date.now(),
        error: true
      }
    };
  },

  /**
   * Format timestamps consistently
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  },

  /**
   * Clean and normalize message content
   */
  normalizeMessageContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ');
  }
}; 