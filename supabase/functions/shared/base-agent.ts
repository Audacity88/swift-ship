import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { traceable } from "npm:langsmith/traceable";
import { wrapOpenAI } from "npm:langsmith/wrappers";
import { ChatCompletionMessageParam } from 'npm:openai@4';
import { AgentContext, AgentMessage } from './types.ts';

// Ensure LangSmith environment variables are set
const LANGSMITH_TRACING = Deno.env.get("LANGSMITH_TRACING");
const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");

if (!LANGSMITH_API_KEY) {
  console.warn("LANGSMITH_API_KEY is not set. Tracing will not be enabled.");
}

if (!LANGSMITH_TRACING) {
  console.warn("LANGSMITH_TRACING is not set. Tracing will not be enabled.");
}

export abstract class BaseAgent {
  protected openai: OpenAI;
  protected supabase;

  protected constructor(
    protected readonly agentId: string,
    protected readonly agentType: string,
    protected readonly systemMessage: string,
    openaiKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.openai = wrapOpenAI(new OpenAI({ apiKey: openaiKey }));
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  public abstract process: ReturnType<typeof traceable<(context: AgentContext) => Promise<AgentMessage>>>;

  protected createMessage = traceable(
    async (content: string, metadata?: Record<string, any>): Promise<AgentMessage> => {
      return {
        role: 'assistant',
        content,
        metadata: {
          agentId: this.agentId,
          timestamp: Date.now(),
          ...metadata
        }
      };
    },
    { name: "create_message" }
  );

  protected generateEmbedding = traceable(
    async (text: string): Promise<number[]> => {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    },
    { name: "generate_embedding" }
  );

  protected searchSimilarContent = traceable(
    async (embedding: number[], threshold = 0.7, limit = 5) => {
      const { data: matches, error } = await this.supabase.rpc('match_embeddings', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) throw error;
      return matches;
    },
    { name: "search_similar_content" }
  );

  protected getCompletion = traceable(
    async (
      messages: ChatCompletionMessageParam[],
      temperature = 0.7
    ): Promise<string> => {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
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
    },
    { name: "get_completion" }
  );

  protected streamCompletion = traceable(
    async (
      messages: ChatCompletionMessageParam[],
      temperature = 0.7
    ) => {
      const stream = await this.openai.chat.completions.create({
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
        presence_penalty: 0.5,
        stream: true
      });

      return stream;
    },
    { name: "stream_completion" }
  );
} 