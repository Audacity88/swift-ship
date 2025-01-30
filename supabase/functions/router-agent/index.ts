import { serve } from './deps.ts';
import { RouterAgent } from './router-agent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface AgentRequest {
  message: string;
  conversationHistory: Message[];
  metadata?: Record<string, any>;
}

interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as AgentRequest;
    console.log('Raw request body:', body);

    const { message, conversationHistory, metadata } = body;
    if (!message && (!conversationHistory || conversationHistory.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'No input provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    const allMessages = safeHistory;
    if (!safeHistory.length && message) {
      allMessages.push({ role: 'user', content: message });
    }

    const routerAgent = new RouterAgent(Deno.env.get('OPENAI_API_KEY') ?? '');
    const agentResponse: AgentResponse = await routerAgent.process({
      messages: allMessages,
      metadata
    });

    const stream = new ReadableStream({
      start(controller) {
        try {
          const encodeSSE = (data: any) => `data: ${JSON.stringify(data)}\n\n`;

          // Send the JSON response from router agent
          controller.enqueue(
            new TextEncoder().encode(
              encodeSSE({
                type: 'routing',
                content: agentResponse.content
              })
            )
          );

          // If we have debug logs
          if (agentResponse.metadata?.debugLogs) {
            controller.enqueue(
              new TextEncoder().encode(
                encodeSSE({
                  type: 'metadata',
                  logs: agentResponse.metadata.debugLogs
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

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || error.toString() }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});