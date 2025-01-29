import { serve, createClient, OpenAI } from './deps.ts'
import { QuoteAgent } from './shared/agents/quote-agent.ts'
import type { AgentContext, AgentMessage } from './shared/types.ts'
import { AgentFactory } from './shared/agent-factory.ts'

// Maintain a single instance of the quote agent
const quoteAgent = new QuoteAgent();

// Embeddings service implementation
class EmbeddingsService {
  private supabase;
  private openai;

  constructor(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async searchSimilarContent(query: string, threshold = 0.5, limit = 5): Promise<any[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search for similar content
      const { data: results, error } = await this.supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      });
      
      if (error) throw error;
      return results || [];
    } catch (error) {
      console.error('Error searching similar content:', error);
      return [];
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  metadata?: {
    agentId?: string;
    timestamp?: number;
    tools?: string[];
    userId?: string;
    token?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
    sources?: { title: string; url: string }[];
  }
}

interface AgentRequest {
  message: string
  conversationHistory: Message[]
  agentType: string
  metadata?: {
    agentType?: string
    userId?: string
    token?: string
    customer?: {
      id: string
      name: string
      email: string
    }
  }
}

interface AgentResponse {
  content: string
  metadata?: Record<string, any>
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, agentType, metadata } = await req.json();

    // Convert the conversation history to the expected format
    const messages: AgentMessage[] = [
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata
      })),
      {
        role: 'user',
        content: message,
        metadata: {
          timestamp: Date.now(),
          ...metadata
        }
      }
    ];

    // Get the appropriate agent
    const agent = AgentFactory.getAgent(agentType || 'router');
    
    // Process the request
    const response = await agent.process({ 
      messages,
      metadata: {
        ...metadata,
        environment: 'edge',
        agentType
      }
    });

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the response content
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'chunk',
                content: response.content,
                metadata: {
                  agent: agentType?.toUpperCase() || 'ROUTER_AGENT',
                  ...response.metadata
                }
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}); 