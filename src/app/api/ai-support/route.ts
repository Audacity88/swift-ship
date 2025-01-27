import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agentId: string;
    timestamp: number;
    tools?: string[];
  };
}

interface AgentResponse {
  content: string;
  metadata: {
    agent: 'DOCS_AGENT' | 'SUPPORT_AGENT' | 'BILLING_AGENT';
    timestamp: number;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory } = await req.json();

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

    // Call the edge function
    const { data, error } = await supabase.functions.invoke<AgentResponse>('process-agent', {
      body: { 
        message, 
        conversationHistory: conversationHistory || [] 
      }
    });

    if (error) {
      console.error('Edge Function Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process request' },
        { status: error.status || 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No response from agent' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Support Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
} 