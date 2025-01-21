import { createClient } from '@supabase/supabase-js';
import { 
  SearchField, 
  SearchGroup,
  SavedSearch,
  SearchCondition,
  SearchResponse,
  SearchFilters,
  SearchAnalytics
} from '@/types/search'
import { DEFAULT_SEARCH_FIELDS, buildSearchQuery } from '@/types/search'
import type { Ticket } from '@/types/ticket'
import { db } from '@/lib/db'
import { Article } from '@/types/knowledge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface SearchFacets {
  [key: string]: Array<{ value: string | number; count: number }>
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  metadata: {
    executionTimeMs: number;
    query: string;
  };
}

export class SearchService {
  private searchFields: SearchField[]

  constructor(customFields: SearchField[] = []) {
    this.searchFields = [...DEFAULT_SEARCH_FIELDS, ...customFields]
  }

  /**
   * Search tickets with advanced filtering
   */
  async searchTickets(
    query: SearchGroup,
    options: {
      page?: number
      pageSize?: number
      sort?: { field: string; direction: 'asc' | 'desc' }[]
    } = {}
  ): Promise<SearchResult<Ticket>> {
    const { page = 1, pageSize = 20, sort = [] } = options

    // Build search query string
    const queryString = buildSearchQuery(query)

    // TODO: Execute search against database/search engine
    // This would typically use Elasticsearch, Algolia, or similar

    return {
      items: [],
      total: 0,
      metadata: {
        executionTimeMs: 0,
        query: queryString
      }
    }
  }

  /**
   * Get available search fields
   */
  getSearchFields(): SearchField[] {
    return this.searchFields
  }

  /**
   * Add custom search fields
   */
  addSearchFields(fields: SearchField[]): void {
    this.searchFields.push(...fields)
  }

  /**
   * Save a search query
   */
  async saveSearch(search: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>): Promise<SavedSearch> {
    const now = new Date().toISOString()
    const savedSearch: SavedSearch = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...search
    }

    // TODO: Save to database
    return savedSearch
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    // TODO: Fetch from database
    return []
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(id: string, userId: string): Promise<void> {
    // TODO: Delete from database
  }

  /**
   * Get type-ahead suggestions for a field
   */
  async getFieldSuggestions(
    field: string,
    prefix: string,
    limit = 5
  ): Promise<string[]> {
    // TODO: Implement type-ahead suggestions
    return []
  }

  /**
   * Validate a search condition
   */
  validateCondition(condition: SearchCondition): { valid: boolean; error?: string } {
    const field = this.searchFields.find(f => f.id === condition.field)
    
    if (!field) {
      return { valid: false, error: 'Invalid field' }
    }

    if (!field.operators.includes(condition.operator)) {
      return { valid: false, error: 'Invalid operator for field type' }
    }

    switch (field.type) {
      case 'enum':
        if (['in', 'not_in'].includes(condition.operator)) {
          if (!Array.isArray(condition.value)) {
            return { valid: false, error: 'Value must be an array' }
          }
          const values = condition.value as string[]
          if (!values.every(v => field.enumValues?.includes(v))) {
            return { valid: false, error: 'Invalid enum values' }
          }
        } else if (!field.enumValues?.includes(condition.value as string)) {
          return { valid: false, error: 'Invalid enum value' }
        }
        break

      case 'date':
        if (condition.operator === 'between') {
          if (!condition.valueEnd || 
              typeof condition.value !== 'string' || typeof condition.valueEnd !== 'string' ||
              isNaN(Date.parse(condition.value)) || isNaN(Date.parse(condition.valueEnd))) {
            return { valid: false, error: 'Invalid date range' }
          }
        } else if (typeof condition.value !== 'string' || isNaN(Date.parse(condition.value))) {
          return { valid: false, error: 'Invalid date' }
        }
        break

      case 'number':
        if (condition.operator === 'between') {
          if (typeof condition.value !== 'number' || typeof condition.valueEnd !== 'number') {
            return { valid: false, error: 'Invalid number range' }
          }
        } else if (typeof condition.value !== 'number') {
          return { valid: false, error: 'Invalid number' }
        }
        break
    }

    return { valid: true }
  }

  /**
   * Get a field value from a ticket using dot notation
   */
  private getFieldValue(ticket: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], ticket)
  }

  // Search articles with relevance scoring and highlighting
  async searchArticles(
    query: string,
    filters: SearchFilters,
    userId: string,
    userType: 'customer' | 'agent'
  ): Promise<SearchResult<Article>> {
    const startTime = Date.now();
    
    try {
      const { data: results, error } = await supabase
        .from('articles')
        .select('*')
        .textSearch('search_vector', query)
        .eq('status', 'published')
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 10) - 1);

      if (error) throw error;
      
      await this.trackSearchAnalytics({
        query,
        searcherId: userId,
        searcherType: userType,
        filters,
        resultCount: results.length,
        executionTimeMs: Date.now() - startTime
      });

      return {
        items: results,
        total: results.length,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          query
        }
      };
    } catch (error) {
      await this.trackFailedSearch({
        query,
        searcherId: userId,
        searcherType: userType,
        filters,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get search suggestions based on past searches
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    const { data: results, error } = await supabase
      .from('search_suggestions')
      .select('word')
      .ilike('word', `${partialQuery}%`)
      .order('frequency', { ascending: false })
      .order('last_searched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return results.map(row => row.word);
  }

  // Track successful searches for analytics
  private async trackSearchAnalytics(data: SearchAnalytics): Promise<void> {
    const { error } = await supabase
      .from('search_analytics')
      .insert([{
        query: data.query,
        searcher_type: data.searcherType,
        searcher_id: data.searcherId,
        filters: data.filters,
        result_count: data.resultCount,
        execution_time_ms: data.executionTimeMs
      }]);

    if (error) throw error;
  }

  // Track failed searches for monitoring
  private async trackFailedSearch(data: {
    query: string;
    searcherId: string;
    searcherType: 'customer' | 'agent';
    filters: SearchFilters;
    errorMessage: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('failed_searches')
      .insert([{
        query: data.query,
        searcher_type: data.searcherType,
        searcher_id: data.searcherId,
        filters: data.filters,
        error_message: data.errorMessage
      }]);

    if (error) throw error;
  }

  // Refresh search suggestions materialized view
  async refreshSearchSuggestions(): Promise<void> {
    const { error } = await supabase.rpc('refresh_search_suggestions');
    if (error) throw error;
  }
}

// Create singleton instance
export const searchService = new SearchService() 