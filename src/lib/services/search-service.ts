import type { 
  SearchField, 
  SearchGroup,
  SavedSearch,
  SearchCondition,
  SearchResponse
} from '@/types/search'
import { DEFAULT_SEARCH_FIELDS, buildSearchQuery } from '@/types/search'
import type { Ticket } from '@/types/ticket'

export interface SearchFacets {
  [key: string]: Array<{ value: string | number; count: number }>
}

export interface SearchResult {
  total: number
  page: number
  pageSize: number
  results: Ticket[]
  facets: SearchFacets
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
      facets?: string[]
    } = {}
  ): Promise<SearchResult> {
    const { page = 1, pageSize = 20, sort = [], facets = [] } = options

    // Build search query string
    const queryString = buildSearchQuery(query)

    // TODO: Execute search against database/search engine
    // This would typically use Elasticsearch, Algolia, or similar

    return {
      total: 0,
      page,
      pageSize,
      results: [],
      facets: {}
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
   * Build facets for search results
   */
  private buildFacets(tickets: Ticket[], fields: string[]): SearchResult['facets'] {
    const facets: SearchResult['facets'] = {}

    fields.forEach(field => {
      const values = new Map<string | number, number>()
      
      tickets.forEach(ticket => {
        const value = this.getFieldValue(ticket, field)
        if (value !== undefined) {
          values.set(value, (values.get(value) || 0) + 1)
        }
      })

      facets[field] = Array.from(values.entries()).map(([value, count]) => ({
        value,
        count
      }))
    })

    return facets
  }

  /**
   * Get a field value from a ticket using dot notation
   */
  private getFieldValue(ticket: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], ticket)
  }
}

// Create singleton instance
export const searchService = new SearchService() 