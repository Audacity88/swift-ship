'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PublishedArticle {
  id: string
  title: string
  excerpt: string | null
  slug: string
  category: { name: string } | null
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<PublishedArticle[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await createClient().from('articles')
        .select('id,title,excerpt,slug,category:categories(name)')
        .eq('status', 'published').order('title')
      if (active) {
        setArticles((data || []) as unknown as PublishedArticle[])
        setError(!!error)
        setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const query = searchQuery.trim().toLowerCase()
  const filtered = articles.filter(article =>
    [article.title, article.excerpt, article.category?.name].some(value => value?.toLowerCase().includes(query))
  )

  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-bold">Knowledge Base</h1>
      <Input type="search" aria-label="Search articles" placeholder="Search articles..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
      {loading ? <p>Loading articles...</p> : error ? (
        <p role="alert" className="text-destructive">Articles could not be loaded. Refresh to try again.</p>
      ) : filtered.length === 0 ? (
        <p role="status" className="py-8 text-center text-muted-foreground">{query ? 'No articles match your search.' : 'No published articles yet.'}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(article => (
            <Card key={article.id} className="min-w-0 p-6">
              <BookOpen className="mb-3 h-6 w-6 text-primary" />
              <p className="mb-2 text-sm text-muted-foreground">{article.category?.name || 'General'}</p>
              <Link href={`/articles/${article.slug}`} className="font-semibold text-primary hover:underline">{article.title}</Link>
              {article.excerpt && <p className="mt-2 text-sm text-muted-foreground">{article.excerpt}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
