import { NextRequest, NextResponse } from 'next/server';
import { ArticleStatus } from '@/types/knowledge';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { getServerSupabase } from '@/lib/supabase-client';
import { z } from 'zod';

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
    const categoryId = searchParams.get('categoryId')
    const status = searchParams.get('status') as ArticleStatus | null
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:category_id(*),
        author:author_id(*),
        feedback:article_feedback(*)
      `)

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // Execute query
    const { data: articles, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      )
    }

    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error in GET /api/knowledge/articles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge/articles - Create new article
export async function POST(request: NextRequest) {
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

    const { title, content, excerpt, categoryId, tags, status } = await request.json()

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { error: 'Title, content and category ID are required' },
        { status: 400 }
      )
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabase
      .from('knowledge_categories')
      .select('id')
      .eq('id', categoryId)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Create article
    const { data, error } = await supabase
      .from('knowledge_articles')
      .insert({
        title,
        content,
        excerpt,
        category_id: categoryId,
        tags,
        status: status || ArticleStatus.DRAFT,
        author_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating article:', error)
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/knowledge/articles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 