import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';
import { TicketPriority, TicketStatus } from '@/types/ticket';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.nativeEnum(TicketPriority).optional()
});

// GET /api/portal/tickets - List customer tickets
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TICKETS);
    if ('error' in permissionCheck || !permissionCheck.user) {
      return NextResponse.json(
        { error: permissionCheck.error || 'User not found' },
        { status: permissionCheck.status || 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as TicketStatus | null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        assignee:agents (id, name),
        comments:ticket_comments (
          id,
          content,
          created_at,
          created_by,
          is_internal
        )
      `, { count: 'exact' })
      .eq('customer_id', permissionCheck.user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    // Get tickets with pagination
    const { data: tickets, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    // Format response
    return NextResponse.json({
      tickets: tickets || [],
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

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.CREATE_TICKETS);
    if ('error' in permissionCheck || !permissionCheck.user) {
      return NextResponse.json(
        { error: permissionCheck.error || 'User not found' },
        { status: permissionCheck.status || 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        customer_id: permissionCheck.user.id,
        source: 'portal'
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

    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/portal/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 