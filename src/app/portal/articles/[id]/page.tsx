import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: article, error } = await supabase.from('articles')
    .select('slug').eq('id', id).eq('status', 'published').maybeSingle()
  if (error || !article) notFound()
  redirect(`/articles/${encodeURIComponent(article.slug)}`)
}
