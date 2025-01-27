import { BaseAgent, AgentContext, AgentMessage } from './base-agent';

export class DocsAgent extends BaseAgent {
  constructor() {
    super(
      'docs',
      'documentation',
      `You are a documentation agent responsible for answering questions using the knowledge base.
      Your goals:
      1. Provide accurate information from the documentation
      2. Include relevant links to full documentation when available
      3. Explain technical concepts clearly
      4. Suggest related topics that might be helpful
      
      Always cite your sources using markdown links.`
    );
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    const lastMessage = context.messages[context.messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return this.createMessage('I need a question to help you with documentation.');
    }

    // Generate embedding for the query
    const embedding = await this.generateEmbedding(lastMessage.content);
    
    // Search for relevant documentation
    const matches = await this.searchSimilarContent(embedding, 0.7, 3);
    
    // Prepare context from matches
    const docsContext = matches.map(match => {
      const metadata = match.metadata as { title?: string; url?: string };
      return `
Article: ${metadata.title || 'Untitled'}
URL: ${metadata.url || '#'}
Content: ${match.content}
Similarity: ${match.similarity}
---`;
    }).join('\n');

    // Get completion with documentation context
    const completion = await this.getCompletion([
      { 
        role: 'system', 
        content: `Here is the relevant documentation:\n${docsContext}`
      },
      lastMessage
    ]);

    return this.createMessage(completion);
  }
} 