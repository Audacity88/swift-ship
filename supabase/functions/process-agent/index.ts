import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'
import { QuoteAgent } from './quote-agent.ts'

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversationHistory, agentType, metadata } = await req.json() as AgentRequest

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    const embeddings = new EmbeddingsService(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      Deno.env.get('OPENAI_API_KEY') ?? ''
    )

    // Get the last user message
    const lastUserMessage = conversationHistory?.length > 0 ? conversationHistory[conversationHistory.length - 1] : { role: 'user', content: message }
    if (!lastUserMessage) {
      throw new Error('No user message found')
    }

    // Determine which agent to use and get response
    const isQuoteAgent = agentType === 'quote' || metadata?.agentType === 'quote'
    let response: AgentResponse;
    
    if (isQuoteAgent) {
      // Use the existing QuoteAgent instance
      console.log('Processing quote request with:', {
        message,
        conversationHistory,
        metadata
      });
      
      const allMessages = [
        ...(conversationHistory || []),
        { role: 'user' as const, content: message }
      ];
      
      console.log('Sending messages to quote agent:', allMessages);
      response = await quoteAgent.process({ messages: allMessages, metadata });
      console.log('Quote agent response:', response);
      
      // Create a streaming response for the quote agent's response
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
                    agent: 'QUOTE_AGENT',
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
    }

    // For non-quote agents, continue with existing logic
    let systemMessage = ''
    let sources: { title: string; url: string; score: number }[] = []

    // Get relevant documentation for non-quote agents
    const results = await embeddings.searchSimilarContent(lastUserMessage.content, 0.5, 3)
    sources = results
    const context = results.length > 0 ? results.map(doc => (
      `Content from "${doc.title}":\n${doc.content}\n`
    )).join('\n\n') : ''
    
    systemMessage = `You are a helpful assistant with access to the following documentation:\n\n${context}`

    // Get completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemMessage },
        ...conversationHistory.slice(-5) // Include last 5 messages for context
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true
    });

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'chunk',
                    content,
                    metadata: {
                      agent: 'DOCS_AGENT'
                    }
                  })}\n\n`
                )
              );
            }
          }
          // Send sources at the end
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'sources',
                sources: sources.map(source => ({
                  title: source.title,
                  url: source.url,
                  score: source.score
                })),
                metadata: {
                  agent: 'DOCS_AGENT'
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
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}) 