import type { TicketListItem } from '@/types/ticket'
import { TicketPriority } from '@/types/ticket'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession()
  console.log('Auth session check:', { session, error }) // Debug log
  
  if (error) {
    console.error('Session error:', error)
    throw new Error('Authentication error: ' + error.message)
  }
  
  if (!session?.access_token) {
    console.error('No access token found in session')
    throw new Error('Not authenticated')
  }

  // Get the raw token
  const token = await supabase.auth.getSession().then(({ data: { session } }) => session?.access_token)
  if (!token) {
    throw new Error('No token available')
  }

  console.log('Got auth token:', token.slice(0, 10) + '...') // Debug log - only show first 10 chars
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

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

  const headers = await getAuthHeaders()
  const response = await fetch(`/api/tickets?${queryParams.toString()}`, {
    credentials: 'include',
    headers
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
  comments: Array<{
    id: string
    content: string
    authorType: 'customer' | 'agent'
    authorId: string
    createdAt: string
    updatedAt: string
    isInternal?: boolean
    user: {
      name: string
      email: string
    }
  }>
  assignee?: {
    id: string
    name: string
    email: string
    avatar_url?: string
    role: 'agent' | 'admin'
  }
  customer: {
    id: string
    name: string
    email: string
    avatar_url?: string
    company?: string
  }
  isArchived: boolean
}

interface ValidationError {
  path: string[];
  message: string;
}

export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  const headers = await getAuthHeaders()
  const response = await fetch('/api/tickets', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 400 && error.details) {
      // Format validation errors
      const messages = error.details.map((err: ValidationError) => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ')
      throw new Error(`Validation failed: ${messages}`)
    }
    throw new Error(error.error || 'Failed to create ticket')
  }

  const result = await response.json()
  return result.data
}

export async function getTicket(id: string): Promise<Ticket> {
  const headers = await getAuthHeaders()
  const url = `/api/tickets/${id}`
  console.log('Fetching ticket:', { url, headers })
  
  const response = await fetch(url, {
    credentials: 'include',
    headers
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch ticket')
  }

  const result = await response.json()
  return result.data
}

export async function updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
  const headers = await getAuthHeaders()
  const response = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update ticket')
  }

  const result = await response.json()
  return result.data
}

export async function addComment(ticketId: string, data: { content: string; isInternal: boolean }): Promise<Ticket['comments'][0]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`/api/tickets/${ticketId}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add comment')
  }

  const result = await response.json()
  return result.data
}

export async function updateTicketStatus(ticketId: string, status: string, reason?: string): Promise<Ticket> {
  const headers = await getAuthHeaders()
  const response = await fetch(`/api/tickets/${ticketId}/status`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ status, reason }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update status')
  }

  const result = await response.json()
  return result.data
} 