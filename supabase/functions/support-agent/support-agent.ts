import { OpenAI, traceable, wrapOpenAI } from './deps.ts';
import { SITE_MAP, type SiteMap } from './site-map.ts';

// Ensure LangSmith environment variables are set
const LANGSMITH_TRACING = Deno.env.get("LANGSMITH_TRACING");
const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");

if (!LANGSMITH_API_KEY) {
  console.warn("LANGSMITH_API_KEY is not set. Tracing will not be enabled.");
}

if (!LANGSMITH_TRACING) {
  console.warn("LANGSMITH_TRACING is not set. Tracing will not be enabled.");
}

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export class SupportAgent {
  private openai: OpenAI;
  private debugLogs: string[] = [];

  constructor(private apiKey: string) {
    this.openai = wrapOpenAI(new OpenAI({ apiKey: this.apiKey }));
  }

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  private systemPrompt = `
You are Swift Ship's technical support agent responsible for helping users with issues and troubleshooting.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship"
2. NEVER provide generic advice about other shipping platforms
3. ONLY suggest pages and features that exist in our platform
4. Be specific about Swift Ship's services and features
5. Use the site map to direct users to relevant pages
6. If a feature or service isn't available, be honest and say so
7. ALWAYS provide clickable links when mentioning pages (e.g. [Shipments](/shipments), [Tracking](/shipments/tracking))
8. Format links as Markdown: [Link Text](/path)

Your goals:
1. Diagnose technical issues accurately
2. Provide step-by-step solutions specific to Swift Ship
3. Create support tickets when necessary
4. Follow up on complex issues
5. Collect relevant technical details

When appropriate, ask for:
- Error messages
- System information
- Steps to reproduce
- Recent changes made

If the issue requires human intervention, recommend creating a ticket at [Support](/support/tickets).

You have access to a site map of relevant pages. Use the suggest_relevant_pages function to direct users to helpful resources when appropriate.
The pages are organized by category (General, Documentation, Shipments, Billing) and include descriptions and keywords.

Example good response for "create new shipment":
"I'll help you create a new shipment with Swift Ship. You can start by visiting our [Shipments](/shipments) section.

Here's what you'll need:
1. Origin and destination addresses
2. Package details (weight, dimensions)
3. Preferred service level (express, standard, or eco freight)

You can also check our [Shipping Guide](/docs/shipping) for detailed instructions. Would you like me to guide you through the process?"

Example bad response:
"Log into your account and look for a create shipment button. You'll need to enter addresses and package details..."
(This is too generic, doesn't reference Swift Ship's specific features, and lacks links)
`;

  private suggestRelevantPages = traceable(
    async (query: string): Promise<Array<{ path: string; reason: string }>> => {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [
          {
            role: 'system',
            content: `You are a helper that suggests relevant pages from a site map. The available pages are: ${JSON.stringify(SITE_MAP, null, 2)}`
          },
          {
            role: 'user',
            content: `Based on this user query, what pages would be most helpful? Query: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_relevant_pages',
            description: 'Suggest relevant pages from the site map based on user query',
            parameters: {
              type: 'object',
              properties: {
                pages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      reason: { type: 'string' }
                    },
                    required: ['path', 'reason']
                  }
                }
              },
              required: ['pages']
            }
          }
        }]
      });

      const toolCalls = completion.choices[0].message.tool_calls;
      if (!toolCalls?.length) return [];

      try {
        const suggestions = JSON.parse(toolCalls[0].function.arguments);
        return suggestions.pages;
      } catch (error) {
        this.log('Error parsing page suggestions:', error);
        return [];
      }
    },
    { name: "suggest_relevant_pages" }
  );

  public process = traceable(
    async (context: AgentContext): Promise<AgentResponse> => {
      const lastMessage = context.messages[context.messages.length - 1];
      if (!lastMessage) {
        return {
          content: "How can I help you with your technical issue?",
          metadata: { debugLogs: this.debugLogs }
        };
      }

      try {
        // Get relevant pages based on the user's message
        const relevantPages = await this.suggestRelevantPages(lastMessage.content);

        // Build conversation for OpenAI
        const conversation = [
          { role: 'system', content: this.systemPrompt },
          ...context.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ];

        if (relevantPages.length > 0) {
          conversation.push({
            role: 'system',
            content: `Relevant pages for this query: ${JSON.stringify(relevantPages, null, 2)}\nIncorporate these suggestions naturally in your response when appropriate.`
          });
        }

        // Get streaming completion
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo-0125',
          messages: conversation,
          temperature: 0.7,
          max_tokens: 700,
          stream: true
        });

        let fullContent = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
          }
        }

        return {
          content: fullContent,
          metadata: {
            debugLogs: this.debugLogs,
            suggestedPages: relevantPages
          }
        };

      } catch (error) {
        this.log('Error calling OpenAI:', error);
        return {
          content: "I encountered an error while trying to assist you. Please try again later or contact support.",
          metadata: {
            debugLogs: this.debugLogs
          }
        };
      }
    },
    { name: "support_agent_process" }
  );
}