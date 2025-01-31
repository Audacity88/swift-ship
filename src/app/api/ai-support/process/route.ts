import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              // Handle cookie setting error
              console.error('Error setting cookie:', error);
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete(name, options);
            } catch (error) {
              // Handle cookie deletion error
              console.error('Error deleting cookie:', error);
            }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message, conversationHistory, agentType, metadata } = await request.json();

    // Convert the conversation history to the expected format
    const messages = [
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata
      })),
      {
        role: 'user',
        content: message,
        metadata: {
          timestamp: Date.now(),
          ...metadata,
          userId: user.id
        }
      }
    ];

    // Call the appropriate Edge Function based on agent type
    const { data: response, error } = await supabase.functions.invoke(
      `${agentType || 'router'}-agent`,
      {
        body: {
          messages,
          metadata: {
            ...metadata,
            environment: process.env.NODE_ENV,
            agentType,
            userId: user.id
          }
        }
      }
    );

    if (error) {
      throw error;
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the response content
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'chunk',
                content: response.content,
                metadata: {
                  agent: agentType?.toUpperCase() || 'ROUTER_AGENT',
                  ...response.metadata
                }
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 