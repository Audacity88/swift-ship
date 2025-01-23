import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { ArticleStatus } from '@/types/knowledge';

// GET /api/knowledge/search - Search articles
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const status = searchParams.get('status') as ArticleStatus | null;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Build search query
    let dbQuery = supabase
      .from('knowledge_articles')
      .select('*, category:category_id(*), author:author_id(*)')
      .textSearch('searchable_text', query);

    // Add filters
    if (category) {
      dbQuery = dbQuery.eq('category_id', category);
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status);
    } else {
      // By default, only show published articles
      dbQuery = dbQuery.eq('status', ArticleStatus.PUBLISHED);
    }

    // Execute search
    const { data: articles, error } = await dbQuery;

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Failed to search articles' },
        { status: 500 }
      );
    }

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error in knowledge search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 