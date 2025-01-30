import { OpenAI, Configuration } from './deps.ts';

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

export class RouterAgent {
  private openai: OpenAI;
  private debugLogs: string[] = [];

  constructor(apiKey: string) {
    this.openai = new OpenAI(new Configuration({ apiKey }));
  }

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  private systemPrompt = `
You are a router agent responsible for analyzing user queries and determining which specialized agent should handle them.
Available agents:
1. QUOTE_AGENT - For shipping quotes, pricing information, and rate calculations
2. SUPPORT_AGENT - For technical support, troubleshooting, billing inquiries, and bug reports
3. SHIPMENTS_AGENT - For questions about shipment planning, logistics, and delivery scheduling

Respond with JSON: { "agent": "AGENT_NAME", "reason": "explanation" }
`;

  public async process(context: AgentContext): Promise<AgentResponse> {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) {
      return {
        content: JSON.stringify({
          agent: 'QUOTE_AGENT',
          reason: 'No user message found, defaulting to QUOTE_AGENT'
        }),
        metadata: { debugLogs: this.debugLogs }
      };
    }

    const conversation = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: lastMessage.content }
    ];

    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: conversation,
        temperature: 0.0,
        max_tokens: 200
      });
      const content = completion.data.choices[0].message?.content || '';

      // Try to see if content is valid JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (_err) {
        // fallback
        parsed = { agent: 'SUPPORT_AGENT', reason: 'Could not parse JSON' };
      }

      // Return the JSON string
      return {
        content: JSON.stringify(parsed),
        metadata: {
          debugLogs: this.debugLogs
        }
      };
    } catch (error) {
      this.log('Router agent error:', error);
      return {
        content: JSON.stringify({
          agent: 'SUPPORT_AGENT',
          reason: 'Error routing user request'
        }),
        metadata: {
          debugLogs: this.debugLogs
        }
      };
    }
  }
}