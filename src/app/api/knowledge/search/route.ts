import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { ArticleStatus } from '@/types/knowledge';

// GET /api/knowledge/search - Search articles
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const categoryId = searchParams.get('categoryId')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Build search query
    let dbQuery = supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(*),
        author:author_id(*)
      `)
      .or(`title.ilike.%${query}%, content.ilike.%${query}%`)
      .eq('status', ArticleStatus.PUBLISHED)

    // Apply category filter if provided
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId)
    }

    // Execute search
    const { data: articles, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error searching articles:', error)
      return NextResponse.json(
        { error: 'Failed to search articles' },
        { status: 500 }
      )
    }

    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error in GET /api/knowledge/search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 