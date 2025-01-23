import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';
import { TicketStatus } from '@/types/ticket';

const createCommentSchema = z.object({
  content: z.string().min(1)
});

// POST /api/portal/tickets/[id]/comment - Add ticket comment
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content, attachments } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check if ticket exists and belongs to user
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, customer_id')
      .eq('id', params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (ticket.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - This ticket does not belong to you' },
        { status: 403 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: params.id,
        content,
        created_by: user.id,
        is_internal: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error creating ticket comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create ticket comment' },
        { status: 500 }
      );
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentsToInsert = attachments.map(attachment => ({
        ticket_id: params.id,
        comment_id: comment.id,
        file_name: attachment.name,
        file_size: attachment.size,
        file_type: attachment.type,
        file_url: attachment.url,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: attachmentsError } = await supabase
        .from('ticket_attachments')
        .insert(attachmentsToInsert);

      if (attachmentsError) {
        console.error('Error adding attachments:', attachmentsError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error in POST /api/portal/tickets/[id]/comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 