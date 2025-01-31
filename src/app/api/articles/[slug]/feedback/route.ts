import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const { isHelpful } = await request.json()
    const supabase = await createClient()

    // First get the article ID from the slug
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .single()

    if (articleError || !article) {
      console.error('Error finding article:', articleError)
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Then update the feedback
    const { error } = await supabase.rpc('increment_article_feedback', {
      article_id: article.id,
      feedback_type: isHelpful ? 'helpful' : 'not_helpful'
    })

    if (error) {
      console.error('Error updating feedback:', error)
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 