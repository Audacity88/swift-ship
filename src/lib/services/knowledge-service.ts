import { supabase } from '@/lib/supabase'
import type { Article, Category, ArticleStatus } from '@/types/knowledge'
import type { ArticleInteraction, ArticleRating } from '@/types/portal'

interface GetArticlesOptions {
  page?: number
  pageSize?: number
  status?: ArticleStatus
  categoryId?: string
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

export const knowledgeService = {
  async getArticles(page = 1, pageSize = 10, options: Partial<GetArticlesOptions> = {}): Promise<{ articles: Article[], total: number }> {
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })

    if (options.status) {
      query = query.eq('status', options.status)
    }
    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId)
    }

    query = query
      .order(options.sort?.field || 'updated_at', { 
        ascending: options.sort?.direction === 'asc' 
      })
      .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to get articles:', error)
      return { articles: [], total: 0 }
    }

    const articles = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      slug: row.slug,
      status: row.status as ArticleStatus,
      categoryId: row.category_id,
      tags: row.tags || [],
      author: row.author || { id: '', name: '', email: '' },
      metadata: row.metadata || {
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        lastUpdated: row.updated_at
      },
      highlight: row.highlight,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))

    return { articles, total: count || 0 }
  },

  async createArticle(article: Partial<Article>): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: article.title,
        content: article.content,
        slug: article.slug,
        status: article.status || 'draft',
        category_id: article.categoryId,
        tags: article.tags || [],
        author: article.author || {},
        metadata: article.metadata || {},
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create article:', error)
      return null
    }
    return data
  },

  async updateArticle(articleId: string, updates: Partial<Article>): Promise<boolean> {
    const { error } = await supabase
      .from('articles')
      .update({
        title: updates.title,
        content: updates.content,
        tags: updates.tags,
        status: updates.status,
        category_id: updates.categoryId,
        slug: updates.slug,
      })
      .eq('id', articleId)

    if (error) {
      console.error('Failed to update article:', error)
      return false
    }
    return true
  },

  async deleteArticle(articleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('Failed to delete article:', error)
      return false
    }
    return true
  },

  async searchArticles(query: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .ilike('title', `%${query}%`)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to search articles:', error)
      return []
    }

    return data as Article[]
  },

  // Article Interactions
  async trackArticleView(articleId: string, userId?: string): Promise<void> {
    const { error } = await supabase
      .from('article_interactions')
      .insert([{
        articleId,
        userId,
        type: 'view',
      }])

    if (error) {
      console.error('Failed to track article view:', error)
    }

    // Update view count in article metadata
    await this._updateArticleMetadata(articleId, 'views')
  },

  async rateArticle(articleId: string, userId: string, isHelpful: boolean): Promise<void> {
    const { error } = await supabase
      .from('article_ratings')
      .upsert([{
        articleId,
        userId,
        isHelpful,
      }], {
        onConflict: 'userId,articleId'
      })

    if (error) {
      console.error('Failed to rate article:', error)
      return
    }

    // Update helpful/not helpful count in article metadata
    await this._updateArticleMetadata(articleId, isHelpful ? 'helpfulCount' : 'notHelpfulCount')
  },

  // Internal method for updating article metadata
  async _updateArticleMetadata(articleId: string, field: 'views' | 'helpfulCount' | 'notHelpfulCount'): Promise<void> {
    const { data: article } = await supabase
      .from('articles')
      .select('metadata')
      .eq('id', articleId)
      .single()

    if (article) {
      const metadata = article.metadata || {}
      metadata[field] = (metadata[field] || 0) + 1

      await supabase
        .from('articles')
        .update({ metadata })
        .eq('id', articleId)
    }
  }
}