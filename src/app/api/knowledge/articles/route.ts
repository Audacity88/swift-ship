import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Article, ArticleStatus, SearchFilters } from '@/types/knowledge';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const createArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  status: z.nativeEnum(ArticleStatus).optional(),
  tags: z.array(z.string().uuid()).optional()
});

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as ArticleStatus | null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from('articles')
      .select(`
        *,
        category:categories (id, name),
        tags:article_tags (
          tag:tags (id, name, color)
        )
      `, { count: 'exact' });

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Only show published articles to customers
    if (permissionCheck.user.type === 'customer') {
      query = query.eq('status', ArticleStatus.PUBLISHED);
    } else if (status) {
      query = query.eq('status', status);
    }

    // Get articles with pagination
    const { data: articles, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    // Format response
    return NextResponse.json({
      articles: articles || [],
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        page,
        limit
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createArticleSchema.parse(body);

    // Start transaction
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        title: validatedData.title,
        content: validatedData.content,
        category_id: validatedData.categoryId,
        status: validatedData.status || ArticleStatus.DRAFT,
        created_by: permissionCheck.user.id
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

    // Add tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      const { error: tagsError } = await supabase
        .from('article_tags')
        .insert(
          validatedData.tags.map(tagId => ({
            article_id: article.id,
            tag_id: tagId
          }))
        );

      if (tagsError) {
        console.error('Error adding article tags:', tagsError);
        return NextResponse.json(
          { error: 'Failed to add article tags' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/knowledge/articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 