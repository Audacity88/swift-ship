import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agentId: string;
    timestamp: number;
    tools?: string[];
  };
}

interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

interface SearchResult {
  title: string;
  content: string;
  url?: string;
  score: number;
}

async function searchSimilarDocuments(
  openai: OpenAI,
  supabaseClient: any,
  query: string,
  matchThreshold: number = 0.7,
  matchCount: number = 3
): Promise<SearchResult[]> {
  try {
    // Get embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Search for similar content in Supabase
    const { data: matches, error } = await supabaseClient.rpc(
      'match_embeddings',
      {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      }
    );

    if (error) throw error;

    return matches.map((match: any) => ({
      title: match.title,
      content: match.content,
      url: match.url,
      score: match.similarity
    }));
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body = await req.json()
    const { message, conversationHistory = [] } = body

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize OpenAI with the key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('Missing OpenAI API key')
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Initialize Supabase client
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) {
      console.error('Missing Supabase service key')
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseClient = createClient(
      'https://dkrhdxqqkgutrnvsfhxi.supabase.co',
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    try {
      // Search for relevant documents
      const similarDocs = await searchSimilarDocuments(openai, supabaseClient, message);
      const context = similarDocs.map(doc => `Title: ${doc.title}\nContent: ${doc.content}`).join('\n\n');

      // Determine agent type based on content
      const routingResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a router agent. Based on the user query and similar content, determine which agent should handle this request.
            Available agents:
            1. DOCS_AGENT - For documentation and how-to questions
            2. SUPPORT_AGENT - For technical issues and troubleshooting
            3. BILLING_AGENT - For pricing and subscription questions
            
            Respond with only the agent name.`,
          },
          {
            role: 'user',
            content: `Query: ${message}\n\nSimilar content: ${context}`,
          },
        ],
        temperature: 0,
      })

      const agentType = routingResponse.choices[0].message?.content?.trim() || 'DOCS_AGENT'

      // Get agent response with context
      const agentResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a ${agentType.toLowerCase().replace('_', ' ')}. 
            Use the following context from our knowledge base to help answer the user's question:
            ${context}
            
            If you find relevant information in the context, use it to provide accurate answers.
            If you need to reference documentation, include the relevant links.
            If you cannot find relevant information in the context, provide a general response based on your knowledge.`,
          },
          ...(Array.isArray(conversationHistory) ? conversationHistory : []),
          { role: 'user', content: message },
        ],
      })

      const response = {
        content: agentResponse.choices[0].message?.content,
        metadata: {
          agent: agentType,
          timestamp: Date.now(),
          context: similarDocs.map(doc => ({
            title: doc.title,
            url: doc.url,
            score: doc.score,
          })),
        },
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('OpenAI or Supabase error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 