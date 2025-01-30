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

export class SupportAgent {
  private openai: OpenAI;
  private debugLogs: string[] = [];

  constructor(private apiKey: string) {
    this.openai = new OpenAI(new Configuration({ apiKey: this.apiKey }));
  }

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  private systemPrompt = `
You are a technical support agent responsible for helping users with issues and troubleshooting.
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

If the issue requires human intervention, recommend creating a ticket.
`;

  public async process(context: AgentContext): Promise<AgentResponse> {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) {
      return {
        content: "How can I help you with your technical issue?",
        metadata: { debugLogs: this.debugLogs }
      };
    }

    // Build conversation for OpenAI
    const conversation = [
      { role: 'system', content: this.systemPrompt },
      ...context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 700
      });
      const content = completion.data.choices[0].message?.content || '';
      return {
        content,
        metadata: {
          debugLogs: this.debugLogs
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