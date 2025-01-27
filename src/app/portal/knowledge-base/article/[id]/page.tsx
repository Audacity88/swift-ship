'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ThumbsUp, ThumbsDown, Tag } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

interface Article {
  id: string
  title: string
  content: string
  excerpt: string
  category: {
    id: string
    name: string
  }
  author: {
    id: string
    name: string
  }
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  helpful_count?: number
  not_helpful_count?: number
}

export default function ArticlePage() {
  const router = useRouter()
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/portal/articles/${params.id}`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch article')
        }

        const data = await response.json()
        setArticle(data)
      } catch (error) {
        console.error('Error fetching article:', error)
        toast.error('Failed to load article')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchArticle()
    }
  }, [params.id])

  const handleVote = async (isHelpful: boolean) => {
    if (!article || hasVoted) {
      toast.error('You have already provided feedback for this article')
      return
    }

    try {
      const response = await fetch(`/api/portal/articles/${article.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setHasVoted(true)
      toast.success('Thank you for your feedback!')

      // Update local state to reflect the new vote count
      setArticle(prev => {
        if (!prev) return null
        return {
          ...prev,
          helpful_count: isHelpful ? (prev.helpful_count || 0) + 1 : prev.helpful_count,
          not_helpful_count: !isHelpful ? (prev.not_helpful_count || 0) + 1 : prev.not_helpful_count
        }
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading article...</p>
        </div>
      </div>
    )
  }

  if (!article || article.status !== 'published') {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Article not found or unavailable</p>
          <Link href="/portal/knowledge-base">
            <Button variant="link" className="mt-4">
              Return to Knowledge Base
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Articles
        </Button>
        <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {article.category.name}
          </span>
          <span className="mx-2">•</span>
          <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
          <span className="mx-2">•</span>
          <span>By {article.author.name}</span>
        </div>
      </div>

      <Card className="p-8 mb-8">
        <div className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-p:text-base prose-p:leading-7
            prose-a:text-primary hover:prose-a:underline
            prose-strong:font-semibold
            prose-ul:list-disc prose-ol:list-decimal
            prose-blockquote:border-l-4 prose-blockquote:border-muted
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-6 mb-3" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              p: ({node, ...props}) => <p className="mb-4" {...props} />
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </Card>

      <div className="border-t dark:border-gray-800 pt-6">
        <h3 className="text-lg font-medium mb-4">Was this article helpful?</h3>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-[100px]"
            onClick={() => handleVote(true)}
            disabled={hasVoted}
          >
            <ThumbsUp className="h-4 w-4" />
            Yes ({article.helpful_count || 0})
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-[100px]"
            onClick={() => handleVote(false)}
            disabled={hasVoted}
          >
            <ThumbsDown className="h-4 w-4" />
            No ({article.not_helpful_count || 0})
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Still need help?{' '}
            <Link href="/portal/contact" className="text-primary hover:underline font-medium">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 