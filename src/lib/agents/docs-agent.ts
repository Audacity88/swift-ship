import { BaseAgent } from './base-agent';
import { AgentMessage } from './types';
import { EmbeddingsService, SearchResult } from '../services/embeddings-service';

export class DocsAgent extends BaseAgent {
  private embeddingsService: EmbeddingsService;

  constructor() {
    super({
      name: 'Documentation Agent',
      description: 'I help answer questions about our documentation and knowledge base.',
      goals: [
        'Provide accurate information from our knowledge base',
        'Include relevant links to documentation',
        'Explain technical concepts clearly',
        'Suggest related topics when appropriate'
      ]
    });
    this.embeddingsService = EmbeddingsService.getInstance();
  }

  private async getRelevantContext(query: string): Promise<string> {
    try {
      const results = await this.embeddingsService.searchSimilarContent(query, 0.5, 3);
      if (!results.length) return '';

      // Format the context with the most relevant documents
      return results.map(doc => (
        `From ${doc.title} (${doc.url}):\n${doc.content}\n`
      )).join('\n---\n\n');
    } catch (error) {
      console.error('Error getting relevant context:', error);
      return '';
    }
  }

  async process(messages: AgentMessage[]): Promise<AgentMessage> {
    try {
      // Get the last user message
      const lastUserMessage = messages.findLast(m => m.role === 'user');
      if (!lastUserMessage) {
        return this.createMessage('I need a question to help you with.');
      }

      // Get relevant context from our knowledge base
      const context = await this.getRelevantContext(lastUserMessage.content);
      
      // Prepare the system message with context
      const systemMessage = `You are a helpful documentation agent. Use the following relevant documentation to answer the user's question. If you can't find a relevant answer in the documentation, say so.

Relevant documentation:
${context || 'No directly relevant documentation found.'}`;

      // Get completion from OpenAI
      const completion = await this.getCompletion([
        { role: 'system', content: systemMessage },
        ...messages.slice(-5) // Include last 5 messages for context
      ]);

      // Create response with metadata about sources used
      const sources = context ? this.extractSources(context) : [];
      return this.createMessage(completion, { sources });

    } catch (error) {
      console.error('Error in DocsAgent:', error);
      return this.createMessage(
        'I encountered an error while trying to process your request. Please try again.'
      );
    }
  }

  private extractSources(context: string): { title: string; url: string }[] {
    const sourceRegex = /From (.*?) \((.*?)\):/g;
    const sources: { title: string; url: string }[] = [];
    let match;

    while ((match = sourceRegex.exec(context)) !== null) {
      sources.push({
        title: match[1],
        url: match[2]
      });
    }

    return sources;
  }
} 