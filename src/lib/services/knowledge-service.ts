import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
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
  async getArticles(
    context: ServerContext,
    page = 1,
    pageSize = 10,
    options: Partial<GetArticlesOptions> = {}
  ): Promise<{ articles: Article[], total: number }> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      let query = supabase
        .from('knowledge_articles')
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
        throw error
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
    } catch (error) {
      console.error('Error in getArticles:', error)
      throw error
    }
  },

  async createArticle(context: ServerContext, article: Partial<Article>): Promise<Article | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('knowledge_articles')
        .insert({
          title: article.title,
          content: article.content,
          slug: article.slug,
          status: article.status || 'draft',
          category_id: article.categoryId,
          tags: article.tags || [],
          author: session.user,
          metadata: article.metadata || {},
          created_by: session.user.id,
          updated_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create article:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createArticle:', error)
      throw error
    }
  },

  async updateArticle(context: ServerContext, articleId: string, updates: Partial<Article>): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('knowledge_articles')
        .update({
          title: updates.title,
          content: updates.content,
          tags: updates.tags,
          status: updates.status,
          category_id: updates.categoryId,
          slug: updates.slug,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)

      if (error) {
        console.error('Failed to update article:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in updateArticle:', error)
      throw error
    }
  },

  async deleteArticle(context: ServerContext, articleId: string): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('id', articleId)

      if (error) {
        console.error('Failed to delete article:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteArticle:', error)
      throw error
    }
  },

  async searchArticles(context: ServerContext, query: string): Promise<Article[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Failed to search articles:', error)
        throw error
      }

      return data as Article[]
    } catch (error) {
      console.error('Error in searchArticles:', error)
      throw error
    }
  },

  async trackArticleView(context: ServerContext, articleId: string, userId?: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('article_interactions')
        .insert([{
          article_id: articleId,
          user_id: userId || session.user.id,
          type: 'view',
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Failed to track article view:', error)
        throw error
      }

      await this._updateArticleMetadata(context, articleId, 'views')
    } catch (error) {
      console.error('Error in trackArticleView:', error)
      throw error
    }
  },

  async rateArticle(context: ServerContext, articleId: string, userId: string, isHelpful: boolean): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('article_ratings')
        .upsert([{
          article_id: articleId,
          user_id: userId,
          is_helpful: isHelpful,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id,article_id'
        })

      if (error) {
        console.error('Failed to rate article:', error)
        throw error
      }

      await this._updateArticleMetadata(context, articleId, isHelpful ? 'helpful' : 'not_helpful')
    } catch (error) {
      console.error('Error in rateArticle:', error)
      throw error
    }
  },

  async _updateArticleMetadata(context: ServerContext, articleId: string, type: 'views' | 'helpful' | 'not_helpful'): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase.rpc('update_article_metadata', {
        p_article_id: articleId,
        p_type: type
      })

      if (error) {
        console.error('Failed to update article metadata:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in _updateArticleMetadata:', error)
      throw error
    }
  }
}