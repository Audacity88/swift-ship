import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { TicketStatus } from '@/types/ticket';

// GET /api/portal/tickets - List customer tickets
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TicketStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(*),
        assignee:assignee_id(*),
        team:team_id(*),
        comments:ticket_comments(*),
        attachments:ticket_attachments(*),
        custom_fields:ticket_custom_fields(*),
        tags:ticket_tags(*)
      `)
      .eq('customer_id', user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data: tickets, error: ticketsError, count } = await query
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tickets,
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error in GET /api/portal/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, description, priority, type, customFields } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        type,
        status: TicketStatus.NEW,
        customer_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      );
    }

    // Add custom fields if provided
    if (customFields && Object.keys(customFields).length > 0) {
      const customFieldsToInsert = Object.entries(customFields).map(([key, value]) => ({
        ticket_id: ticket.id,
        field_key: key,
        field_value: value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: customFieldsError } = await supabase
        .from('ticket_custom_fields')
        .insert(customFieldsToInsert);

      if (customFieldsError) {
        console.error('Error adding custom fields:', customFieldsError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error in POST /api/portal/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 