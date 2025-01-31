import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'
import { QuoteAgent } from './quote-agent.ts'

// Maintain a single instance of the quote agent
const quoteAgent = new QuoteAgent();

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
    const requestBody = await req.json() as AgentRequest;
    console.log('Raw request body:', requestBody);
    
    const { message, conversationHistory, agentType, metadata } = requestBody;

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    // Get the last user message from the conversation history
    console.log('Received conversation history:', conversationHistory);

    if (conversationHistory === undefined) {
      console.error('conversationHistory is undefined');
    }

    console.log('Received message:', message);

    const lastUserMessage = conversationHistory?.length > 0 
      ? conversationHistory[conversationHistory.length - 1]
      : { role: 'user', content: message };

    console.log('Debug - Values:', {
      message,
      conversationHistory,
      lastUserMessage
    });

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
      console.log('Processing quote request with:', {
        lastUserMessage,
        conversationHistory,
        metadata
      });
      
      // Safely handle messages and conversation history
      const safeHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
      
      // Always use the full conversation history
      const allMessages = safeHistory;
      
      console.log('Sending messages to quote agent:', {
        messageCount: allMessages.length,
        lastMessage: allMessages[allMessages.length - 1]?.content,
        allMessages // Log the full messages array for debugging
      });
      response = await quoteAgent.process({ messages: allMessages, metadata });
      console.log('Quote agent response:', response);
      
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