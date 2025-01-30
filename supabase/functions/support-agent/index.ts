import { serve } from './deps.ts';
import { SupportAgent } from './support-agent.ts';

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

    const agent = new SupportAgent(Deno.env.get('OPENAI_API_KEY') ?? '');
    const agentResponse: AgentResponse = await agent.process({
      messages: allMessages,
      metadata
    });

    const stream = new ReadableStream({
      start(controller) {
        try {
          const encodeSSE = (data: any) => {
            const jsonString = JSON.stringify(data);
            return `data: ${jsonString}\n\n`;
          };

          controller.enqueue(
            new TextEncoder().encode(
              encodeSSE({
                type: 'chunk',
                content: agentResponse.content
              })
            )
          );

          if (agentResponse.metadata) {
            controller.enqueue(
              new TextEncoder().encode(
                encodeSSE({
                  type: 'metadata',
                  metadata: {
                    agent: 'SUPPORT_AGENT',
                    ...agentResponse.metadata
                  }
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