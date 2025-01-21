import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Article, ArticleStatus, SearchFilters } from '@/types/knowledge';
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

// GET /api/knowledge/articles - List articles with filtering
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as ArticleStatus;
    const tag = searchParams.get('tag');

    // Build query
    let query = supabase
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
        metadata:article_metadata (*)
      `);

    // Apply filters
    if (categoryId) {
      query = query.eq('categoryId', categoryId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: articles, error, count } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articles,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      }
    });
  } catch (error) {
    console.error('Error in GET /api/knowledge/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/articles - Create new article
export async function POST(request: NextRequest) {
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
      tags = [],
      status = ArticleStatus.DRAFT
    } = body;

    // Validate required fields
    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Start a transaction
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        title,
        slug,
        content,
        excerpt,
        categoryId,
        tags,
        status,
        authorId: session.user.id,
        currentVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (articleError) {
      console.error('Error creating article:', articleError);
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }

    // Create initial version
    const { error: versionError } = await supabase
      .from('article_versions')
      .insert({
        articleId: article.id,
        version: 1,
        title,
        content,
        createdBy: session.user.id,
        createdAt: new Date().toISOString(),
        changeDescription: 'Initial version'
      });

    if (versionError) {
      console.error('Error creating article version:', versionError);
      // Don't fail the request, but log the error
    }

    // Create initial metadata
    const { error: metadataError } = await supabase
      .from('article_metadata')
      .insert({
        articleId: article.id,
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        lastUpdated: new Date().toISOString()
      });

    if (metadataError) {
      console.error('Error creating article metadata:', metadataError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      message: 'Article created successfully',
      article
    });
  } catch (error) {
    console.error('Error in POST /api/knowledge/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 