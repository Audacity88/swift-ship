import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await both cookies() and params before using them
    const [cookieStore, { id }] = await Promise.all([
      cookies(),
      context.params
    ])

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Fetch the article from the database
    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        status,
        created_at,
        updated_at,
        category:categories(id, name),
        author:agents(id, name)
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('[Article API] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: 500 }
      )
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('[Article API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 