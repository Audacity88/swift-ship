import { serve } from './deps.ts';
import { ShipmentsAgent } from './shipments-agent.ts';

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
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const body = await req.json() as Request;
    if (!body.message && (!body.conversationHistory?.length)) {
      return new Response(
        JSON.stringify({ error: 'No input provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agent = ShipmentsAgent.getInstance(apiKey);
    const safeHistory = Array.isArray(body.conversationHistory) ? 
      body.conversationHistory.slice(-2) : 
      [];
    
    if (!safeHistory.length && body.message) {
      safeHistory.push({ role: 'user', content: body.message });
    }

    const response = await agent.process({
      messages: safeHistory,
      metadata: body.metadata
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();

          // Split content into lines first
          const lines = response.content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Split each line into words
            const words = line.split(/(\s+)/);
            
            for (const word of words) {
              const data = encoder.encode(
                `data: ${JSON.stringify({ type: 'chunk', content: word })}\n\n`
              );
              controller.enqueue(data);
              // Small delay between words
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            
            // Add newline if not the last line
            if (i < lines.length - 1) {
              const newline = encoder.encode(
                `data: ${JSON.stringify({ type: 'chunk', content: '\n' })}\n\n`
              );
              controller.enqueue(newline);
              // Slightly longer delay after newlines
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          // Send metadata if available
          if (response.metadata) {
            const metadata = encoder.encode(
              `data: ${JSON.stringify({ type: 'metadata', metadata: response.metadata })}\n\n`
            );
            controller.enqueue(metadata);
          }

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

  } catch (error: unknown) {
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      {
        status: err.message === 'OpenAI API key not configured' ? 503 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});