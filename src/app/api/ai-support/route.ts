import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: values => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      } }
    );
    // getSession alone reads untrusted cookie data; verify the caller first.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token || session.user.id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory = [], agentType = 'quote', metadata } = await req.json();
    if (typeof message !== 'string' || !message.trim() || message.length > 20000) {
      return NextResponse.json({ error: 'A message of 1 to 20000 characters is required' }, { status: 400 });
    }
    if (!Array.isArray(conversationHistory) || conversationHistory.length > 100 ||
        conversationHistory.some(msg => !msg || !['user', 'assistant'].includes(msg.role) ||
          typeof msg.content !== 'string' || msg.content.length > 20000)) {
      return NextResponse.json({ error: 'Invalid conversation history' }, { status: 400 });
    }
    const agentEndpoints: Record<string, string> = {
      quote: 'quote-agent', docs: 'docs-agent', shipments: 'shipments-agent', support: 'support-agent'
    };
    const endpoint = typeof agentType === 'string' && Object.prototype.hasOwnProperty.call(agentEndpoints, agentType)
      ? agentEndpoints[agentType] : undefined;
    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid agent type' }, { status: 400 });
    }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory.map(({ role, content }) => ({ role, content })),
          agentType,
          // Identity and credentials are resolved again by the edge entrypoint.
          metadata: { agentType, quote: metadata?.quote }
        })
      }
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to process request' }, { status: response.status });
    }
    return new NextResponse(response.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
