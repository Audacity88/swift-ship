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

    // Get search parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Start building the query
    let dbQuery = supabase
      .from('articles')
      .select(`
        *,
        category:categories (
          id,
          name,
          slug
        ),
        author:users (
          id,
          name,
          email
        ),
        versions (
          id,
          content,
          createdAt
        )
      `)
      .eq('status', 'PUBLISHED');

    // Apply text search if query is provided
    if (query) {
      dbQuery = dbQuery.textSearch('title', query, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Apply category filter if provided
    if (categoryId) {
      dbQuery = dbQuery.eq('categoryId', categoryId);
    }

    // Apply sorting
    switch (sortBy) {
      case 'title':
        dbQuery = dbQuery.order('title', { ascending: sortOrder === 'asc' });
        break;
      case 'createdAt':
        dbQuery = dbQuery.order('createdAt', { ascending: sortOrder === 'asc' });
        break;
      case 'updatedAt':
        dbQuery = dbQuery.order('updatedAt', { ascending: sortOrder === 'asc' });
        break;
      case 'views':
        dbQuery = dbQuery.order('viewCount', { ascending: sortOrder === 'asc' });
        break;
      default: // relevance - only applies when there's a search query
        if (query) {
          dbQuery = dbQuery.order('ts_rank', { ascending: false });
        } else {
          dbQuery = dbQuery.order('updatedAt', { ascending: false });
        }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    // Execute the query
    const { data: articles, error: searchError, count } = await dbQuery;

    if (searchError) {
      console.error('Error searching articles:', searchError);
      return NextResponse.json(
        { error: 'Failed to search articles' },
        { status: 500 }
      );
    }

    // Process articles to include only the latest version
    const processedArticles = articles?.map(article => ({
      ...article,
      currentVersion: article.versions?.[0] || null,
      versions: undefined // Remove versions array from response
    }));

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PUBLISHED')
      .textSearch('title', query, {
        type: 'websearch',
        config: 'english'
      });

    if (countError) {
      console.error('Error getting total count:', countError);
      return NextResponse.json(
        { error: 'Failed to get total count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articles: processedArticles,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
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