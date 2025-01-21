import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check user permissions
async function checkUserPermissions(requiredPermission: Permission) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, custom_permissions')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData) {
    return { error: 'User not found', status: 404 };
  }

  const { data: permissions } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', userData.role)
    .single();

  if (!permissions?.permissions?.includes(requiredPermission)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { session, userData };
}

// POST /api/portal/tickets/[id]/comment - Add ticket comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_PORTAL);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;

    // Verify ticket exists and belongs to user
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', params.id)
      .eq('customerId', session.user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot comment on closed tickets' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticketId: params.id,
        content,
        authorId: session.user.id,
        createdAt: new Date().toISOString()
      })
      .select(`
        *,
        author:users (
          id,
          name
        )
      `)
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Update ticket last activity
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        lastActivityAt: new Date().toISOString(),
        status: 'AWAITING_RESPONSE' // Change status to indicate customer response
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      // Don't fail the request, just log the error
    }

    // Track activity
    const { error: activityError } = await supabase
      .from('portal_activity')
      .insert({
        userId: session.user.id,
        type: 'TICKET_COMMENT',
        resourceId: params.id,
        createdAt: new Date().toISOString()
      });

    if (activityError) {
      console.error('Error tracking activity:', activityError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Error in POST /api/portal/tickets/[id]/comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 