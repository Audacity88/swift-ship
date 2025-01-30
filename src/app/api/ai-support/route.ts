import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agent?: string;
    timestamp?: number;
    context?: Array<{
      title: string;
      url: string;
      score: number;
    }>;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, agentType = 'quote', metadata } = await req.json();
    console.log('Received request:', { message, conversationHistory, agentType, metadata });

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Conversation history must be an array' },
        { status: 400 }
      );
    }

    // Map agent type to the correct edge function
    const agentEndpoints = {
      quote: 'quote-agent',
      docs: 'docs-agent',
      shipments: 'shipments-agent',
      support: 'support-agent'
    };

    const endpoint = agentEndpoints[agentType as keyof typeof agentEndpoints];
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Invalid agent type' },
        { status: 400 }
      );
    }

    // Call the appropriate edge function with streaming
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory || [],
          agentType,
          metadata: {
            ...metadata,
            agentType
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge Function Error:', error);
      return NextResponse.json(
        { error: error || 'Failed to process request' },
        { status: response.status }
      );
    }

    // Forward the streaming response
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 