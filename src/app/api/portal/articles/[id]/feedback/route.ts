import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const createFeedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().optional()
});

// POST /api/portal/articles/[id]/feedback - Submit article feedback
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createFeedbackSchema.parse(body);

    // Check if article exists and is published
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('id', params.id)
      .single();

    if (articleError || !article) {
      console.error('Error fetching article:', articleError);
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (article.status !== 'published') {
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
        customer_id: permissionCheck.user.id,
        helpful: validatedData.helpful,
        comment: validatedData.comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error creating feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to create feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json(feedback);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/portal/articles/[id]/feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 