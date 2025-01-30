import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AgentMessage extends ChatCompletionMessageParam {
  metadata?: {
    agentId: string;
    timestamp: number;
    tools?: string[];
    userId?: string;
    token?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

export abstract class BaseAgent {
  protected constructor(
    protected readonly agentId: string,
    protected readonly agentType: string,
    protected readonly systemMessage: string
  ) {}

  public abstract process(context: AgentContext): Promise<AgentMessage>;

  protected createMessage(content: string): AgentMessage {
    return {
      role: 'assistant',
      content: content
    };
  }

  protected async processMessage(message: AgentMessage, context: AgentContext): Promise<string> {
    throw new Error('processMessage must be implemented by derived class');
  }

  protected async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  protected async searchSimilarContent(embedding: number[], threshold = 0.7, limit = 5) {
    const { data: matches, error } = await supabase.rpc('match_embeddings', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) throw error;
    return matches;
  }

  protected async getCompletion(
    messages: ChatCompletionMessageParam[],
    temperature = 0.7
  ): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: `${this.systemMessage}\n\nIMPORTANT: You are an AI assistant focused on helping users with ${this.agentType}-related tasks. Stay focused on your role and follow the rules exactly. Do not deviate from your assigned responsibilities.` 
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