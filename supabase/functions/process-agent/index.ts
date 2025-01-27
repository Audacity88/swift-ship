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
    let sources: { title: string; url: string }[] = []

    if (agent === 'docs') {
      const results = await embeddings.searchSimilarContent(lastUserMessage.content, 0.5, 3)
      
      if (results.length > 0) {
        const context = results.map(doc => (
          `From ${doc.title} (${doc.url}):\n${doc.content}\n`
        )).join('\n---\n\n')

        systemMessage = `You are a helpful documentation agent. Use the following relevant documentation to answer the user's question. If you can't find a relevant answer in the documentation, say so.

Relevant documentation:
${context}`

        sources = results.map(doc => ({
          title: doc.title,
          url: doc.url
        }))
      } else {
        systemMessage = `You are a helpful documentation agent. No directly relevant documentation was found for this query. Please inform the user and suggest they rephrase their question or contact support if needed.`
      }
    } else if (agent === 'support') {
      systemMessage = `You are a helpful support agent. Your goal is to assist users with their technical issues and questions.`
    } else if (agent === 'billing') {
      systemMessage = `You are a helpful billing agent. Your goal is to assist users with billing and payment related questions.`
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
      max_tokens: 500
    })

    const response = completion.choices[0].message?.content || 'No response generated'

    return new Response(
      JSON.stringify({
        response,
        sources: sources.length > 0 ? sources : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
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