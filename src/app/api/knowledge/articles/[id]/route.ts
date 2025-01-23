import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { ArticleStatus } from '@/types/knowledge';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  tags: z.array(z.string().uuid()).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/knowledge/articles/[id] - Get article details
export async function GET(req: NextRequest, props: RouteContext) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get article with related data
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(*),
        author:author_id(*),
        feedback:article_feedback(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching article:', error);
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: 500 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error in GET /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/articles/[id] - Update article
export async function PUT(req: NextRequest, props: RouteContext) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await req.json();
    const {
      title,
      content,
      excerpt,
      categoryId,
      tags,
      status,
      changeDescription
    } = body;

    // Validate article exists
    const { data: existingArticle, error: articleError } = await supabase
      .from('articles')
      .select('currentVersion')
      .eq('id', params.id)
      .single();

    if (articleError || !existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const newVersion = existingArticle.currentVersion + 1;

    // Create new version first
    const { error: versionError } = await supabase
      .from('article_versions')
      .insert({
        articleId: params.id,
        version: newVersion,
        title,
        content,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        changeDescription
      });

    if (versionError) {
      console.error('Error creating article version:', versionError);
      return NextResponse.json(
        { error: 'Failed to create article version' },
        { status: 500 }
      );
    }

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({
        title,
        content,
        excerpt,
        categoryId,
        tags,
        status,
        currentVersion: newVersion,
        updatedAt: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating article:', updateError);
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      );
    }

    // Update metadata
    const { error: metadataError } = await supabase
      .from('article_metadata')
      .update({
        lastUpdated: new Date().toISOString(),
        ...(status === ArticleStatus.PUBLISHED ? { publishedAt: new Date().toISOString() } : {})
      })
      .eq('articleId', params.id);

    if (metadataError) {
      console.error('Error updating article metadata:', metadataError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      message: 'Article updated successfully',
      article: updatedArticle
    });
  } catch (error) {
    console.error('Error in PUT /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/articles/[id] - Archive article
export async function DELETE(req: NextRequest, props: RouteContext) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Delete article feedback first
    const { error: feedbackError } = await supabase
      .from('article_feedback')
      .delete()
      .eq('article_id', params.id);

    if (feedbackError) {
      console.error('Error deleting article feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to delete article feedback' },
        { status: 500 }
      );
    }

    // Then delete the article
    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting article:', error);
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/knowledge/articles/[id] - Patch article
export async function PATCH(req: NextRequest, props: RouteContext) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const updates = await req.json();

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Update article
    const { data: updatedArticle, error } = await supabase
      .from('knowledge_articles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating article:', error);
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('Error in PATCH /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 