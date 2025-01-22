import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';
import { TicketStatus } from '@/types/ticket';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const createCommentSchema = z.object({
  content: z.string().min(1)
});

// POST /api/portal/tickets/[id]/comment - Add ticket comment
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.CREATE_COMMENTS);
    if ('error' in permissionCheck || !permissionCheck.user) {
      return NextResponse.json(
        { error: permissionCheck.error || 'User not found' },
        { status: permissionCheck.status || 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Verify ticket exists and belongs to user
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', params.id)
      .eq('customer_id', permissionCheck.user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    // Check if ticket is closed
    if (ticket.status === TicketStatus.CLOSED) {
      return NextResponse.json(
        { error: 'Cannot comment on closed tickets' },
        { status: 400 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: params.id,
        content: validatedData.content,
        created_by: permissionCheck.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Update ticket status and last activity
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: TicketStatus.AWAITING_RESPONSE,
        updated_at: new Date().toISOString(),
        updated_by: permissionCheck.user.id
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/portal/tickets/[id]/comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 