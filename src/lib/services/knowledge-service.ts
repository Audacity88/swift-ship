import { createClient } from '@supabase/supabase-js';
import { 
  Article, 
  ArticleStatus, 
  Category, 
  SearchFilters, 
  SearchResponse, 
  ArticleFeedback, 
  ArticleVersion,
  ArticleAnalytics
} from '@/types/knowledge';
import { supabase } from '@/lib/supabase';

export class KnowledgeService {
  // Article CRUD Operations
  async getArticles(page = 1, pageSize = 10, filters?: Partial<SearchFilters>) {
    const query = supabase
      .from('articles')
      .select('*, author:agents(*), category:categories(*)')
      .order('createdAt', { ascending: false });

    if (filters?.categoryId) {
      query.eq('category_id', filters.categoryId);
    }
    if (filters?.status) {
      query.eq('status', filters.status);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query.contains('tags', filters.tags);
    }
    if (filters?.authorId) {
      query.eq('author_id', filters.authorId);
    }
    if (filters?.dateRange) {
      query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    const { data: articles, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1)
      .returns<Article[]>();

    if (error) throw error;
    return { articles, count };
  }

  async getArticleById(id: string): Promise<Article> {
    const { data: article, error } = await supabase
      .from('articles')
      .select('*, author:agents(*), category:categories(*), versions:article_versions(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return article;
  }

  async createArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .insert([{
        ...article,
        currentVersion: 1,
        metadata: {
          views: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          lastUpdated: new Date(),
        }
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .update({
        ...updates,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async archiveArticle(id: string): Promise<void> {
    const { error } = await supabase
      .from('articles')
      .update({ status: ArticleStatus.ARCHIVED })
      .eq('id', id);

    if (error) throw error;
  }

  // Category Management
  async getCategories(): Promise<Category[]> {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return this.buildCategoryTree(categories);
  }

  private buildCategoryTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: Build tree structure
    categories.forEach(category => {
      const currentCategory = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children?.push(currentCategory);
        }
      } else {
        rootCategories.push(currentCategory);
      }
    });

    return rootCategories;
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Search Functionality
  async searchArticles(query: string, filters?: SearchFilters): Promise<SearchResponse> {
    const { data: results, error, count } = await supabase
      .rpc('search_articles', {
        search_query: query,
        category_id: filters?.categoryId,
        status: filters?.status,
        tags: filters?.tags,
        author_id: filters?.authorId,
        start_date: filters?.dateRange?.start,
        end_date: filters?.dateRange?.end
      });

    if (error) throw error;

    return {
      results,
      total: count || 0,
      page: 1,
      pageSize: results.length,
      filters: filters || {}
    };
  }

  async getRelatedArticles(articleId: string, limit = 5): Promise<Article[]> {
    const { data: articles, error } = await supabase
      .rpc('get_related_articles', {
        article_id: articleId,
        limit_num: limit
      });

    if (error) throw error;
    return articles;
  }

  // Version Management
  async createVersion(version: Omit<ArticleVersion, 'id' | 'createdAt'>): Promise<ArticleVersion> {
    const { data, error } = await supabase
      .from('article_versions')
      .insert([version])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async revertToVersion(articleId: string, versionId: string): Promise<Article> {
    const { data: version, error: versionError } = await supabase
      .from('article_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (versionError) throw versionError;

    const { data: article, error: articleError } = await supabase
      .from('articles')
      .update({
        content: version.content,
        title: version.title,
        updatedAt: new Date()
      })
      .eq('id', articleId)
      .select()
      .single();

    if (articleError) throw articleError;
    return article;
  }

  // Analytics Tracking
  async trackView(articleId: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment_article_views', {
        article_id: articleId
      });

    if (error) throw error;
  }

  async getArticleMetrics(articleId: string, startDate: Date, endDate: Date): Promise<ArticleAnalytics> {
    const { data, error } = await supabase
      .from('article_analytics')
      .select('*')
      .eq('articleId', articleId)
      .gte('periodStart', startDate)
      .lte('periodEnd', endDate)
      .single();

    if (error) throw error;
    return data;
  }

  async getPopularArticles(limit = 10): Promise<Article[]> {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*, author:agents(*), category:categories(*)')
      .eq('status', ArticleStatus.PUBLISHED)
      .order('metadata->views', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return articles;
  }

  // Feedback Management
  async submitFeedback(feedback: Omit<ArticleFeedback, 'id' | 'createdAt'>): Promise<ArticleFeedback> {
    const { data, error } = await supabase
      .from('article_feedback')
      .insert([feedback])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const saveArticle = async (article: Article) => {
  // TODO: Implement actual API call
  return { data: article }
}

export const publishArticle = async (article: Article) => {
  // TODO: Implement actual API call
  return { data: { ...article, status: ArticleStatus.PUBLISHED } }
} 