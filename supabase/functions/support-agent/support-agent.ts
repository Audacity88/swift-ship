import { OpenAI } from './deps.ts';
import { SITE_MAP, type SiteMap } from './site-map.ts';

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
    this.openai = new OpenAI({ apiKey: this.apiKey });
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

If the issue requires human intervention, recommend creating a ticket.

You have access to a site map of relevant pages. Use the suggest_relevant_pages function to direct users to helpful resources when appropriate.
The pages are organized by category (General, Documentation, Shipments, Billing) and include descriptions and keywords.

Example good response for "create new shipment":
"I'll help you create a new shipment with Swift Ship. You can start by visiting our Shipments section at /shipments/tracking.

Here's what you'll need:
1. Origin and destination addresses
2. Package details (weight, dimensions)
3. Preferred service level (express, standard, or eco freight)

Would you like me to guide you through the process?"

Example bad response:
"Log into your account and look for a create shipment button. You'll need to enter addresses and package details..."
(This is too generic and doesn't reference Swift Ship's specific features)
`;

  private async suggestRelevantPages(query: string): Promise<Array<{ path: string; reason: string }>> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
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
        model: 'gpt-4-turbo-preview',
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
  }
}