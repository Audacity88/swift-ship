import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { ArticleStatus } from '@/types/knowledge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/knowledge/search - Search articles
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
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Build search query
    let dbQuery = supabase
      .from('articles')
      .select(`
        *,
        category:categories (id, name),
        tags:article_tags (
          tag:tags (id, name, color)
        )
      `, { count: 'exact' })
      .textSearch('content', query);

    // Only show published articles to customers
    if (permissionCheck.user.type === 'customer') {
      dbQuery = dbQuery.eq('status', ArticleStatus.PUBLISHED);
    }

    // Get search results with pagination
    const { data: articles, count, error } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error searching articles:', error);
      return NextResponse.json(
        { error: 'Failed to search articles' },
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
    console.error('Error in GET /api/knowledge/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 