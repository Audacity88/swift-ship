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

interface Request {
  message: string;
  conversationHistory: Message[];
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as Request;
    if (!body.message && (!body.conversationHistory?.length)) {
      return new Response(
        JSON.stringify({ error: 'No input provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check for LangSmith environment variables
    const langsmithApiKey = Deno.env.get('LANGSMITH_API_KEY');
    const langsmithTracing = Deno.env.get('LANGSMITH_TRACING');
    if (!langsmithApiKey || !langsmithTracing) {
      console.warn('LangSmith environment variables not fully configured. Tracing may not work.');
    }

    const agent = new SupportAgent(apiKey);
    const safeHistory = Array.isArray(body.conversationHistory) ? 
      body.conversationHistory.slice(-10) : 
      [];
    
    if (!safeHistory.length && body.message) {
      safeHistory.push({ role: 'user', content: body.message });
    }

    const agentResponse = await agent.process({
      messages: safeHistory,
      metadata: body.metadata
    });

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

          // Send the content in smaller chunks for better streaming
          const words = agentResponse.content.split(/(\s+)/);
          let currentChunk = '';
          
          for (const word of words) {
            currentChunk += word;
            // Send chunk when it reaches a reasonable size or at the end
            if (currentChunk.length > 20 || word === words[words.length - 1]) {
              controller.enqueue(
                new TextEncoder().encode(
                  encodeSSE({
                    type: 'chunk',
                    content: currentChunk
                  })
                )
              );
              currentChunk = '';
              // Add a small delay between chunks for smoother streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          // Send metadata if available
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