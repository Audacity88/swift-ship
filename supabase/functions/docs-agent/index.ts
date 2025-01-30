import { serve } from './deps.ts';
import { DocsAgent } from './docs-agent.ts';
import { AgentRequest, corsHeaders } from '../shared/types.ts';

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

    const docsAgent = new DocsAgent(
      Deno.env.get('OPENAI_API_KEY') ?? '',
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const agentResponse = await docsAgent.process({
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

          // Send the main content
          controller.enqueue(
            new TextEncoder().encode(
              encodeSSE({
                type: 'chunk',
                content: agentResponse.content
              })
            )
          );

          // Send metadata if available
          if (agentResponse.metadata) {
            controller.enqueue(
              new TextEncoder().encode(
                encodeSSE({
                  type: 'metadata',
                  metadata: {
                    agent: 'DOCS_AGENT',
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