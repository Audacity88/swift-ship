'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ArticleMetric {
  id: string
  title: string
  slug: string
  status: string
  author_id: string | null
  metadata: { views?: number; helpfulCount?: number; notHelpfulCount?: number } | null
}

export default function KnowledgeBaseDashboard() {
  const [articles, setArticles] = useState<ArticleMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await createClient().from('articles')
        .select('id,title,slug,status,author_id,metadata').order('title')
      if (active) {
        setArticles(data || [])
        setError(!!error)
        setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const published = articles.filter(article => article.status === 'published')
  const views = articles.reduce((total, article) => total + Number(article.metadata?.views || 0), 0)
  const helpful = articles.reduce((total, article) => total + Number(article.metadata?.helpfulCount || 0), 0)
  const unhelpful = articles.reduce((total, article) => total + Number(article.metadata?.notHelpfulCount || 0), 0)
  const metrics = [
    { label: 'Total Articles', value: articles.length, note: `${published.length} published` },
    { label: 'Total Views', value: views.toLocaleString(), note: 'Recorded article views' },
    { label: 'Helpful Feedback', value: helpful + unhelpful > 0 ? `${Math.round(100 * helpful / (helpful + unhelpful))}%` : 'No feedback yet', note: `${helpful + unhelpful} responses` },
    { label: 'Authors', value: new Set(articles.map(article => article.author_id).filter(Boolean)).size, note: 'Authors with articles' }
  ]

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Knowledge Base Dashboard</h1>
        <Link className="text-primary hover:underline" href="/admin/knowledge/articles">Manage articles</Link>
      </div>
      {error && <p role="alert" className="text-destructive">Knowledge metrics could not be loaded. Refresh to retry.</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => <Card key={metric.label}><CardHeader><CardTitle className="text-sm">{metric.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{loading ? 'Loading...' : metric.value}</p><p className="mt-2 text-sm text-muted-foreground">{metric.note}</p></CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle>Published articles</CardTitle></CardHeader>
        <CardContent>
          {published.length === 0 && !loading ? <p className="text-muted-foreground">No published articles yet.</p> : <ul className="space-y-3">{published.map(article => <li key={article.id}><Link className="text-primary hover:underline" href={`/articles/${article.slug}`}>{article.title}</Link></li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  )
}
