import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const supabase = await createClient()

    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        category:categories(id, name),
        author:agents(id, name)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching article:', error)
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 