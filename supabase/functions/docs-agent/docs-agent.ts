import { BaseAgent } from '../shared/base-agent.ts';
import { AgentContext, AgentMessage } from '../shared/types.ts';
import { ChatCompletionMessageParam } from 'npm:openai@4';
import { traceable } from "npm:langsmith/traceable";

// Ensure LangSmith environment variables are set
const LANGSMITH_TRACING = Deno.env.get("LANGSMITH_TRACING");
const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");

if (!LANGSMITH_API_KEY) {
  console.warn("LANGSMITH_API_KEY is not set. Tracing will not be enabled.");
}

if (!LANGSMITH_TRACING) {
  console.warn("LANGSMITH_TRACING is not set. Tracing will not be enabled.");
}

export class DocsAgent extends BaseAgent {
  private debugLogs: string[] = [];

  constructor(
    openaiKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    super(
      'docs',
      'documentation',
      `You are Swift Ship's documentation assistant. Your role is to provide accurate information about Swift Ship's services, policies, and procedures.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship"
2. Base responses ONLY on the provided documentation
3. Provide detailed explanations with relevant links when available
4. If information is not in the provided docs, say so and direct to [Support](/support/tickets)
5. Maintain professional and helpful tone
6. Focus on educating and informing users
7. NEVER make up information that's not in the docs
8. ALWAYS provide clickable links when mentioning pages (e.g. [Shipping Guide](/docs/shipping))
9. Format links as Markdown: [Link Text](/path)

AVAILABLE TOPICS:
- Shipping Services & Options
- Service Level Agreements
- Pricing Structure
- Package Guidelines
- Restricted Items
- Insurance & Claims
- Tracking & Delivery
- Payment & Billing
- Account Management
- Contact Information`,
      openaiKey,
      supabaseUrl,
      supabaseKey
    );
  }

  private log = traceable(
    async (message: string, ...args: any[]) => {
      const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
      this.debugLogs.push(logMessage);
      console.log(logMessage);
    },
    { name: "docs_agent_log" }
  );

  public process = traceable(
    async (context: AgentContext): Promise<AgentMessage> => {
      const lastMessage = context.messages[context.messages.length - 1];
      
      if (!lastMessage?.content) {
        return this.createMessage(
          "Hello! I can help you find information about Swift Ship's services and policies. What would you like to know?",
          { debugLogs: this.debugLogs }
        );
      }

      try {
        this.log('Processing query:', lastMessage.content);

        // Generate embedding for the user query
        const userEmbedding = await this.generateEmbedding(lastMessage.content);
        this.log('Generated embedding for query');

        // Search for relevant documentation with a lower threshold
        const matchedDocs = await this.searchSimilarContent(userEmbedding, 0.5, 5);
        this.log('Search results:', { 
          matchCount: matchedDocs?.length || 0,
          docs: matchedDocs?.map(d => ({ 
            title: d.title,
            similarity: d.similarity,
            contentPreview: d.content.substring(0, 100) + '...'
          }))
        });

        if (!matchedDocs || matchedDocs.length === 0) {
          return this.createMessage(
            "I apologize, but I couldn't find any specific documentation about that topic. Please visit our [Support Center](/support/tickets) for assistance.",
            { debugLogs: this.debugLogs }
          );
        }

        // Combine relevant docs
        const docsContext = matchedDocs.map(doc => {
          return `Document Title: ${doc.title}\nContent:\n${doc.content}\n---\n`;
        }).join('\n');

        this.log('Building response with context from', matchedDocs.length, 'documents');

        // Create conversation with context
        const messages: ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: `${this.systemMessage}\n\nHere are the relevant documentation sections to base your response on:\n\n${docsContext}`
          },
          ...context.messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // Get streaming completion with relevant docs context
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: true
        });

        let fullContent = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
          }
        }

        return this.createMessage(fullContent, {
          debugLogs: this.debugLogs,
          matchedDocs: matchedDocs.map(doc => ({
            title: doc.title,
            url: doc.url,
            score: doc.similarity
          }))
        });
      } catch (error) {
        this.log('Error processing docs request:', error);
        return this.createMessage(
          "I encountered an error while searching our documentation. Please try again or visit our [Support Center](/support/tickets) for assistance.",
          { debugLogs: this.debugLogs }
        );
      }
    },
    { name: "docs_agent_process" }
  );
}