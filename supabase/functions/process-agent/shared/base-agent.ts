import { createClient } from '../deps.ts';
import { OpenAI } from '../deps.ts';
import type { 
  AgentConfig, 
  AgentContext, 
  AgentMessage, 
  AgentResponse, 
  AgentEnvironment 
} from './types.ts';

export abstract class BaseAgent {
  protected readonly openai: OpenAI;
  protected readonly supabase: ReturnType<typeof createClient>;
  protected readonly environment: AgentEnvironment;

  protected constructor(
    protected readonly config: AgentConfig,
    environment: AgentEnvironment = 'edge'
  ) {
    this.environment = environment;

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openAiKey || Deno.env.get('OPENAI_API_KEY'),
    });

    // Initialize Supabase client
    const supabaseUrl = config.supabaseUrl || Deno.env.get('SUPABASE_URL');
    const supabaseKey = config.supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  public abstract process(context: AgentContext): Promise<AgentResponse>;

  public getEnvironment(): AgentEnvironment {
    return this.environment;
  }

  protected createMessage(content: string, metadata?: AgentMessage['metadata']): AgentMessage {
    return {
      role: 'assistant',
      content,
      metadata: {
        agentId: this.config.agentId,
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  protected async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  protected async searchSimilarContent(embedding: number[], threshold = 0.7, limit = 5) {
    const { data: matches, error } = await this.supabase.rpc('match_embeddings', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) throw error;
    return matches;
  }

  protected async getCompletion(
    messages: AgentMessage[],
    temperature = 0.7
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: `${this.config.systemMessage}\n\nIMPORTANT: You are an AI assistant focused on helping users with ${this.config.agentType}-related tasks. Stay focused on your role and follow the rules exactly. Do not deviate from your assigned responsibilities.` 
        },
        ...messages
      ],
      temperature,
      max_tokens: 1000,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    });

    return completion.choices[0].message.content || '';
  }
} 