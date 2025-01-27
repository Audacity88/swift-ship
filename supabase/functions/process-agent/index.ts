import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

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
    sources?: { title: string; url: string }[]
  }
}

interface AgentRequest {
  messages: Message[]
  agent: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, agent } = await req.json() as AgentRequest

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
    const lastUserMessage = messages.findLast(m => m.role === 'user')
    if (!lastUserMessage) {
      throw new Error('No user message found')
    }

    // Get relevant context based on the agent type
    let systemMessage = ''
    let sources: { title: string; url: string; score: number }[] = []

    // Get relevant documentation for all agents
    const results = await embeddings.searchSimilarContent(lastUserMessage.content, 0.5, 3)
    const context = results.length > 0 ? results.map(doc => (
      `Content from "${doc.title}":\n${doc.content}\n`
    )).join('\n---\n\n') : ''

    if (results.length > 0) {
      sources = results.map(doc => ({
        title: doc.title,
        url: doc.url,
        score: doc.score
      }))
    }

    if (agent === 'support') {
      systemMessage = `You are Swift Ship's support agent. Your role is to assist users with technical issues and questions about Swift Ship's services.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When mentioning tracking, always say "Swift Ship's tracking system" or "Swift Ship's tracking portal"
3. When mentioning customer service, always say "Swift Ship's support team" or "Swift Ship's customer service"
4. Base your responses on the provided documentation when available
5. If information is not in the provided docs, say "I don't have specific documentation about this issue, but as Swift Ship's support agent, I recommend..."

Here is the relevant documentation to use in your response:
${context}

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.`
    } else if (agent === 'billing') {
      systemMessage = `You are Swift Ship's billing agent. Your role is to assist users with billing, payments, and pricing questions about Swift Ship's services.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When discussing payments, always say "Swift Ship's payment portal" or "Swift Ship's billing system"
3. When mentioning refunds or billing support, always say "Swift Ship's billing team" or "Swift Ship's finance department"
4. Base your responses on the provided documentation when available
5. If information is not in the provided docs, say "I don't have specific documentation about this billing matter, but as Swift Ship's billing agent, I recommend..."

Here is the relevant documentation to use in your response:
${context}

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.`
    } else if (agent === 'quote') {
      systemMessage = `You are Swift Ship's quote agent. Your role is to provide shipping quotes and pricing information for Swift Ship's services.

IMPORTANT RULES:
1. ALWAYS refer to our company as "Swift Ship" - NEVER use generic terms like "carrier" or "shipping company"
2. When discussing shipping options, always specify "Swift Ship's [service level] shipping"
3. When mentioning delivery times, always say "Swift Ship's estimated delivery time"
4. Base your quotes on the provided documentation when available
5. If pricing information is not in the provided docs, say "I don't have current pricing information for this service. Please contact Swift Ship's sales team at sales@swiftship.com for an accurate quote."

Here is the relevant documentation to use in your response:
${context}

Remember: Every response must maintain Swift Ship's brand voice and explicitly reference Swift Ship's services.`
    } else {
      throw new Error(`Unknown agent type: ${agent}`)
    }

    // Get completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages.slice(-5) // Include last 5 messages for context
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true // Enable streaming
    })

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              // Send the chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'chunk',
                    content
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
                sources: sources.length > 0 ? sources.map(source => ({
                  title: source.title,
                  url: source.url,
                  score: source.score
                })) : undefined
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