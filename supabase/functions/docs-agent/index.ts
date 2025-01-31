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

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encodeSSE = (data: any) => {
            const jsonString = JSON.stringify(data);
            // Split long messages into smaller chunks if needed
            const maxChunkSize = 32768; // Increased from 16384
            if (jsonString.length > maxChunkSize) {
              const chunks = [];
              for (let i = 0; i < jsonString.length; i += maxChunkSize) {
                chunks.push(jsonString.slice(i, i + maxChunkSize));
              }
              return chunks.map(chunk => `data: ${chunk}\n`).join('') + '\n';
            }
            return `data: ${jsonString}\n\n`;
          };

          // Send the content in larger chunks for better streaming
          const words = agentResponse.content.split(/(\s+)/);
          let currentChunk = '';
          
          for (const word of words) {
            currentChunk += word;
            // Send chunk when it reaches a reasonable size or at the end
            if (currentChunk.length > 1000 || word === words[words.length - 1]) {  // Increased from 20
              controller.enqueue(
                new TextEncoder().encode(
                  encodeSSE({
                    type: 'chunk',
                    content: currentChunk
                  })
                )
              );
              currentChunk = '';
              // Reduced delay between chunks for faster streaming
              await new Promise(resolve => setTimeout(resolve, 10));  // Reduced from 50
            }
          }

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