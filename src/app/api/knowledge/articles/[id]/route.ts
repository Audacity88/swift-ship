import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ArticleStatus } from '@/types/knowledge';
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

// GET /api/knowledge/articles/[id] - Get article details
export async function GET(
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

    // Get article with related data
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select(`
        *,
        author:users (
          id,
          name,
          email
        ),
        category:categories (
          id,
          name,
          slug
        ),
        metadata:article_metadata (*),
        versions:article_versions (*)
      `)
      .eq('id', params.id)
      .single();

    if (articleError) {
      console.error('Error fetching article:', articleError);
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: 500 }
      );
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Track view if not author
    if (permissionCheck.session.user.id !== article.authorId) {
      await supabase.rpc('increment_article_views', {
        article_id: params.id
      });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error in GET /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/articles/[id] - Update article
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;

    // Get request body
    const body = await request.json();
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
        createdBy: session.user.id,
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Validate article exists
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('status')
      .eq('id', params.id)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Soft delete by archiving
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: ArticleStatus.ARCHIVED,
        updatedAt: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error archiving article:', updateError);
      return NextResponse.json(
        { error: 'Failed to archive article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Article archived successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 