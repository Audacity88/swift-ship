import type { TicketStatus, TicketPriority, Tag } from './ticket'

export type SearchOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'startsWith' 
  | 'endsWith' 
  | 'gt' 
  | 'lt' 
  | 'between'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists'
  | 'greater_than'
  | 'less_than'

export type SearchFieldType = 
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'array'

export interface SearchField {
  id: string
  name: string
  type: SearchFieldType
  path: string // Dot notation path to the field in the ticket object
  operators: SearchOperator[]
  enumValues?: string[] // For enum fields
  isCustomField?: boolean
}

export interface SearchCondition {
  field: string
  operator: SearchOperator
  value: string | number | boolean | null | string[]
  valueEnd?: string | number | boolean | null
  metadata?: Record<string, any>
}

export interface SearchGroup {
  type: 'and' | 'or'
  conditions: SearchCondition[]
  groups?: SearchGroup[]
}

export interface SavedSearch {
  id: string
  name: string
  description?: string
  query: SearchGroup
  is_shared: boolean
  created_by_id: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface SearchSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface SearchPagination {
  page: number
  per_page: number
  total?: number
}

export interface SearchRequest {
  query: SearchGroup
  sort?: SearchSort
  pagination?: SearchPagination
}

export interface SearchResponse<T> {
  data: T[]
  pagination: Required<SearchPagination>
}

// Default search fields
export const DEFAULT_SEARCH_FIELDS: SearchField[] = [
  {
    id: 'title',
    name: 'Title',
    type: 'text',
    path: 'title',
    operators: ['equals', 'not_equals', 'contains', 'not_contains']
  },
  {
    id: 'description',
    name: 'Description',
    type: 'text',
    path: 'description',
    operators: ['contains', 'not_contains']
  },
  {
    id: 'status',
    name: 'Status',
    type: 'enum',
    path: 'status',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    enumValues: ['open', 'in_progress', 'waiting', 'resolved', 'closed']
  },
  {
    id: 'priority',
    name: 'Priority',
    type: 'enum',
    path: 'priority',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    enumValues: ['low', 'medium', 'high', 'urgent']
  },
  {
    id: 'assignee',
    name: 'Assignee',
    type: 'text',
    path: 'assignee.id',
    operators: ['equals', 'not_equals', 'exists', 'not_exists']
  },
  {
    id: 'customer.email',
    name: 'Customer Email',
    type: 'text',
    path: 'customer.email',
    operators: ['equals', 'not_equals', 'contains', 'not_contains']
  },
  {
    id: 'createdAt',
    name: 'Created Date',
    type: 'date',
    path: 'metadata.createdAt',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'between']
  },
  {
    id: 'tags',
    name: 'Tags',
    type: 'array',
    path: 'metadata.tags',
    operators: ['contains', 'not_contains']
  }
]

// Helper functions
export const buildSearchQuery = (group: SearchGroup): string => {
  const conditions = group.conditions.map(condition => {
    const { field, operator, value, valueEnd } = condition
    switch (operator) {
      case 'between':
        return `${field}:${value} TO ${valueEnd}`
      case 'in':
      case 'not_in':
        return `${field}:(${(value as string[]).join(' OR ')})`
      case 'exists':
        return `_exists_:${field}`
      case 'not_exists':
        return `NOT _exists_:${field}`
      default:
        return `${field}:${value}`
    }
  })

  return conditions.join(group.type === 'and' ? ' AND ' : ' OR ')
}

export const parseSearchQuery = (query: string): SearchGroup => {
  // TODO: Implement query string parsing
  return { type: 'and', conditions: [] }
} 