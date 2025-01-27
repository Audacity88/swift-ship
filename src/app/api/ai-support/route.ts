import { NextRequest, NextResponse } from 'next/server';
import { AISupportService } from '@/lib/services/ai-support-service';
import { createClient } from '@supabase/supabase-js';

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

    const aiService = AISupportService.getInstance();
    
    // Check if we need to create a ticket
    const needsTicket = await aiService.shouldCreateTicket(message);
    
    // Generate AI response
    const response = await aiService.generateResponse(message, conversationHistory);

    return NextResponse.json({
      ...response,
      shouldCreateTicket: needsTicket
    });
  } catch (error: any) {
    console.error('AI Support Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 