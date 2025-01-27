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
  };
}

export interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

export abstract class BaseAgent {
  protected id: string;
  protected role: string;
  protected systemPrompt: string;
  protected tools: string[];
  
  constructor(id: string, role: string, systemPrompt: string, tools: string[] = []) {
    this.id = id;
    this.role = role;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
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
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ],
      temperature,
    });

    return completion.choices[0].message.content || '';
  }

  public abstract process(context: AgentContext): Promise<AgentMessage>;

  protected createMessage(content: string, role: 'assistant' | 'user' = 'assistant'): AgentMessage {
    return {
      role,
      content,
      metadata: {
        agentId: this.id,
        timestamp: Date.now(),
        tools: this.tools,
      },
    };
  }
} 