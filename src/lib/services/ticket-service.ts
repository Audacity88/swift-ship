import type { TicketListItem } from '@/types/ticket'
import { TicketPriority } from '@/types/ticket'

interface FetchTicketsParams {
  filters?: {
    status?: string[]
    priority?: string[]
    search?: string
    dateFrom?: string
    dateTo?: string
  }
  pagination?: {
    page: number
    pageSize: number
  }
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

interface FetchTicketsResponse {
  data: TicketListItem[]
  total: number
}

export async function fetchTickets(params: FetchTicketsParams): Promise<FetchTicketsResponse> {
  const queryParams = new URLSearchParams()

  // Add filters
  if (params.filters?.status?.length) {
    queryParams.append('status', params.filters.status.join(','))
  }
  if (params.filters?.priority?.length) {
    queryParams.append('priority', params.filters.priority.join(','))
  }
  if (params.filters?.search) {
    queryParams.append('search', params.filters.search)
  }
  if (params.filters?.dateFrom) {
    queryParams.append('dateFrom', params.filters.dateFrom)
  }
  if (params.filters?.dateTo) {
    queryParams.append('dateTo', params.filters.dateTo)
  }

  // Add pagination
  if (params.pagination) {
    queryParams.append('page', params.pagination.page.toString())
    queryParams.append('pageSize', params.pagination.pageSize.toString())
  }

  // Add sorting
  if (params.sort) {
    queryParams.append('sortField', params.sort.field)
    queryParams.append('sortDirection', params.sort.direction)
  }

  const response = await fetch(`/api/tickets?${queryParams.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Failed to fetch tickets')
  }

  return response.json()
}

export interface CreateTicketData {
  title: string
  description: string
  priority: TicketPriority
  customerId: string
  assigneeId?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface Ticket extends TicketListItem {
  description: string
  metadata: Record<string, unknown>
}

export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 400 && error.details) {
      // Format validation errors
      const messages = error.details.map((err: any) => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ')
      throw new Error(`Validation failed: ${messages}`)
    }
    throw new Error(error.error || 'Failed to create ticket')
  }

  const result = await response.json()
  return result.data
} 