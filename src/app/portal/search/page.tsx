'use client'

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SearchArticle { id: string; title: string; excerpt: string | null; slug: string }

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams?.get('q') || ''
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchArticle[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const supabase = createClient()
      const term = `%${searchQuery.trim().replace(/[\\%_]/g, '\\$&')}%`
      const responses = await Promise.all(['title', 'content'].map(column =>
        supabase.from('articles').select('id,title,excerpt,slug')
          .eq('status', 'published').ilike(column, term).order('title').limit(50)
      ))
      if (responses.some(response => response.error)) throw new Error('Articles could not be searched. Please try again.')
      setResults(Array.from(new Map(responses.flatMap(response => response.data || []).map(article => [article.id, article])).values()))
      setHasSearched(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
    if (initialQuery) void runSearch(initialQuery)
  }, [initialQuery, runSearch])

  const search = (event: FormEvent) => {
    event.preventDefault()
    void runSearch(query)
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">Search Knowledge Base</h1>
      <form onSubmit={search} className="flex gap-2">
        <Input className="min-w-0" aria-label="Search knowledge base" placeholder="Search published articles..." value={query} onChange={event => setQuery(event.target.value)} />
        <Button disabled={loading || !query.trim()}>{loading ? 'Searching...' : 'Search'}</Button>
      </form>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {!hasSearched && !error && <p className="text-muted-foreground">Enter a search term to find articles.</p>}
      {hasSearched && !loading && results.length === 0 && <p role="status" className="py-8 text-center text-muted-foreground">No published articles match your search. Try a different term.</p>}
      <div className="space-y-4">
        {results.map(article => <Card key={article.id} className="p-4"><Link className="font-semibold text-primary hover:underline" href={`/articles/${article.slug}`}>{article.title}</Link><p className="mt-2 text-sm text-muted-foreground">{article.excerpt}</p></Card>)}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return <Suspense fallback={<p>Loading search...</p>}><SearchContent /></Suspense>
}
