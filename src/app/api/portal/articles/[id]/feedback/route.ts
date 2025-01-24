import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const createFeedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().optional()
});

// POST /api/portal/articles/[id]/feedback - Submit article feedback
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

    const { helpful, comment } = await request.json();

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Helpful flag is required and must be a boolean' },
        { status: 400 }
      );
    }

    // Check if article exists
    const { data: article, error: articleError } = await supabase
      .from('knowledge_articles')
      .select('id')
      .eq('id', params.id)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Create feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('article_feedback')
      .insert({
        article_id: params.id,
        customer_id: user.id,
        helpful,
        comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error creating article feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to create article feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error in POST /api/portal/articles/[id]/feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 