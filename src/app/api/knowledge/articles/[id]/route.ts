import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ArticleStatus } from '@/types/knowledge';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  tags: z.array(z.string().uuid()).optional()
});

type RouteContext = {
  params: { id: string }
}

// GET /api/knowledge/articles/[id] - Get article details
export async function GET(
  req: NextRequest,
  { params }: RouteContext
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

    // Get article
    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        category:categories (id, name),
        tags:article_tags (
          tag:tags (id, name, color)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching article:', error);
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if customer can view article
    if (permissionCheck.user.type === 'customer' && article.status !== ArticleStatus.PUBLISHED) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
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
export async function PUT(
  req: NextRequest,
  { params }: RouteContext
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
  req: NextRequest,
  { params }: RouteContext
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

    // Delete article
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting article:', error);
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/knowledge/articles/[id] - Patch article
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
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

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateArticleSchema.parse(body);

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update(validatedData)
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

    return NextResponse.json({
      message: 'Article updated successfully',
      article: updatedArticle
    });
  } catch (error) {
    console.error('Error in PATCH /api/knowledge/articles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 