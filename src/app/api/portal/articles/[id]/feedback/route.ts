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

// POST /api/portal/articles/[id]/feedback - Submit article feedback
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

    // Verify article exists and is published
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('id', params.id)
      .eq('status', 'PUBLISHED')
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get request body
    const body = await request.json();
    const { isHelpful, comment = null } = body;

    // Validate feedback
    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Feedback must specify if article was helpful' },
        { status: 400 }
      );
    }

    // Check if user has already provided feedback
    const { data: existingFeedback, error: feedbackError } = await supabase
      .from('article_feedback')
      .select('id')
      .eq('articleId', params.id)
      .eq('userId', session.user.id)
      .single();

    if (feedbackError && feedbackError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking existing feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to check existing feedback' },
        { status: 500 }
      );
    }

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      const { data: updatedFeedback, error: updateError } = await supabase
        .from('article_feedback')
        .update({
          isHelpful,
          comment,
          updatedAt: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        return NextResponse.json(
          { error: 'Failed to update feedback' },
          { status: 500 }
        );
      }

      feedback = updatedFeedback;
    } else {
      // Create new feedback
      const { data: newFeedback, error: createError } = await supabase
        .from('article_feedback')
        .insert({
          articleId: params.id,
          userId: session.user.id,
          isHelpful,
          comment,
          createdAt: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating feedback:', createError);
        return NextResponse.json(
          { error: 'Failed to create feedback' },
          { status: 500 }
        );
      }

      feedback = newFeedback;
    }

    // Update article metadata
    const { error: metadataError } = await supabase.rpc(
      'update_article_feedback_counts',
      {
        article_id: params.id
      }
    );

    if (metadataError) {
      console.error('Error updating article metadata:', metadataError);
      // Don't fail the request, just log the error
    }

    // Track activity
    const { error: activityError } = await supabase
      .from('portal_activity')
      .insert({
        userId: session.user.id,
        type: 'ARTICLE_FEEDBACK',
        resourceId: params.id,
        createdAt: new Date().toISOString()
      });

    if (activityError) {
      console.error('Error tracking activity:', activityError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      message: existingFeedback ? 'Feedback updated successfully' : 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    console.error('Error in POST /api/portal/articles/[id]/feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 