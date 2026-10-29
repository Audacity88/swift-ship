import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { resolveCaller } from '../_shared/caller.ts'
import { QuoteAgent } from './quote-agent.ts'

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
  }
}

interface AgentRequest {
  message: string
  conversationHistory: Message[]
  agentType: string
  metadata?: {
    quote?: Record<string, any>
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
    const caller = await resolveCaller(req);
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const requestBody = await req.json() as AgentRequest;
    const { message, conversationHistory, agentType } = requestBody;
    const metadata = {
      quote: requestBody.metadata?.quote,
      agentType,
      userId: caller.user.id,
      session: { user: caller.user }
    };
    const quoteAgent = new QuoteAgent(Deno.env.get('SUPABASE_URL') ?? '', caller.token);

    const lastUserMessage = conversationHistory?.length > 0
      ? conversationHistory[conversationHistory.length - 1]
      : { role: 'user', content: message };



    if (!lastUserMessage || !lastUserMessage.content) {
      throw new Error(JSON.stringify({
        error: 'No user message found',
        debug: {
          message,
          conversationHistory,
          lastUserMessage
        }
      }));
    }

    // Determine which agent to use and get response
    const isQuoteAgent = agentType === 'quote' || metadata?.agentType === 'quote'
    let response: AgentResponse;

    if (isQuoteAgent) {
      // Use the existing QuoteAgent instance


      // Safely handle messages and conversation history
      const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.filter(msg => ['user', 'assistant'].includes(msg.role) && typeof msg.content === 'string') : [];

      // Always use the full conversation history
      const allMessages = [...safeHistory, { role: 'user', content: message }];


      response = await quoteAgent.process({ messages: allMessages, metadata });


      // Create a streaming response for the quote agent's response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Helper function to safely encode SSE data
            const encodeSSE = (data: any) => {
              const jsonString = JSON.stringify(data);
              // Split long messages into smaller chunks if needed
              const maxChunkSize = 16384; // 16KB chunks
              if (jsonString.length > maxChunkSize) {
                const chunks = [];
                for (let i = 0; i < jsonString.length; i += maxChunkSize) {
                  chunks.push(jsonString.slice(i, i + maxChunkSize));
                }
                return chunks.map(chunk => `data: ${chunk}\n`).join('') + '\n';
              }
              return `data: ${jsonString}\n\n`;
            };

            // First send just the initial content
            controller.enqueue(
              new TextEncoder().encode(
                encodeSSE({
                  type: 'chunk',
                  content: response.content
                })
              )
            );

            // Then send metadata separately if it exists
            if (response.metadata) {
              controller.enqueue(
                new TextEncoder().encode(
                  encodeSSE({
                    type: 'metadata',
                    metadata: {
                      agent: 'QUOTE_AGENT',
                      ...response.metadata
                    }
                  })
                )
              );
            }

            // Finally send debug logs if they exist
            if (response.metadata?.debugLogs?.length > 0) {
              controller.enqueue(
                new TextEncoder().encode(
                  encodeSSE({
                    type: 'debug',
                    logs: response.metadata.debugLogs
                  })
                )
              );
            }

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
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

    throw new Error('Invalid agent type');

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
