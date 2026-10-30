import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketList from '@/components/features/tickets/TicketList'
import TicketsOverviewPage from '@/app/tickets/overview/page'
import { fetchTickets } from '@/lib/services/ticket-service'
import { TicketStatus, TicketPriority } from '@/types/ticket'
import { getServerSupabase } from '@/lib/supabase-client'
import { getTicketAgent } from '@/lib/auth/ticket-access'
import type { TicketListItem } from '@/types/ticket'

let ticketQueryState = { isLoading: false, data: undefined as { data: TicketListItem[] } | undefined }
jest.mock('@/lib/services', () => ({}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'tickets'
    ? ticketQueryState
    : { isLoading: false, data: undefined },
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/components/features/tickets/CreateTicketForm', () => ({ CreateTicketForm: () => null }))
jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))
jest.mock('@/lib/auth/ticket-access', () => ({ getTicketAgent: jest.fn() }))

// Mock data
const mockTickets: TicketListItem[] = [
  {
    id: '1',
    type: 'question',
    title: 'Test Ticket 1',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    customer: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    },
    assignee: {
      id: '1',
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: 'agent'
    },
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    tags: []
  },
  {
    id: '2',
    type: 'question',
    title: 'Test Ticket 2',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.MEDIUM,
    customer: {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com'
    },
    assignee: {
      id: '2',
      name: 'Agent Johnson',
      email: 'johnson@example.com',
      role: 'agent'
    },
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    tags: []
  }
]

describe('TicketList Component', () => {
  it('renders ticket list with data', () => {
    render(<TicketList tickets={mockTickets} />)
    for (const ticket of mockTickets) {
      const row = screen.getByText(ticket.title).closest('tr')!
      expect(within(row).getByText(ticket.customer.name)).toBeInTheDocument()
      expect(within(row).getByText(ticket.assignee!.name)).toBeInTheDocument()
      expect(within(row).getByText(ticket.priority)).toBeInTheDocument()
      expect(within(row).getByText(ticket.status)).toBeInTheDocument()
      expect(within(row).getByText('Jan 15, 2026')).toBeInTheDocument()
    }
  })

  it('displays the parent loading indicator until tickets are supplied to the table', () => {
    // The overview owns query loading; the real TicketList receives its result.
    ticketQueryState = { isLoading: true, data: undefined }
    const { container, rerender } = render(<TicketsOverviewPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Test Ticket 1')).not.toBeInTheDocument()

    ticketQueryState = { isLoading: false, data: { data: mockTickets } }
    rerender(<TicketsOverviewPage />)
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
  })

  it('opens the clicked ticket without opening it when its checkbox is toggled', async () => {
    const user = userEvent.setup()
    const onTicketClick = jest.fn()
    render(<TicketList tickets={mockTickets} onTicketClick={onTicketClick} />)
    const row = screen.getByText('Test Ticket 2').closest('tr')!
    const checkbox = within(row).getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(onTicketClick).not.toHaveBeenCalled()
    await user.click(screen.getByText('Test Ticket 2'))
    expect(onTicketClick).toHaveBeenCalledTimes(1)
    expect(onTicketClick).toHaveBeenCalledWith('2')
  })

  it('selects and deselects all tickets', async () => {
    const user = userEvent.setup()
    render(<TicketList tickets={mockTickets} />)
    const [selectAll, ...tickets] = screen.getAllByRole('checkbox')
    await user.click(selectAll)
    for (const checkbox of [selectAll, ...tickets]) expect(checkbox).toBeChecked()
    await user.click(selectAll)
    for (const checkbox of [selectAll, ...tickets]) expect(checkbox).not.toBeChecked()
  })
})

// Filtering, search, pagination and request errors are service responsibilities.
// Exercise the real service, mocking only its database boundary.
describe('Ticket list query behavior', () => {
  let query: Record<string, jest.Mock>
  let result: { data: any[] | null; count: number | null; error: Error | null }

  beforeEach(() => {
    jest.resetAllMocks()
    result = { data: [], count: 0, error: null }
    query = {}
    for (const method of ['select', 'eq', 'in', 'ilike', 'gte', 'lte', 'order', 'range']) {
      query[method] = jest.fn(() => query)
    }
    query.then = jest.fn(resolve => Promise.resolve(result).then(resolve))
    jest.mocked(getServerSupabase).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'agent-1' } }, error: null }) },
      from: jest.fn(() => query),
    } as any)
    jest.mocked(getTicketAgent).mockResolvedValue({ role: 'admin' } as any)
  })

  it('filters by status', async () => {
    await fetchTickets(undefined, { filters: { status: [TicketStatus.OPEN] } })
    expect(query.in).toHaveBeenCalledWith('status', [TicketStatus.OPEN])
    expect(query.in).toHaveBeenCalledTimes(1)
    expect(query.range).toHaveBeenCalledWith(0, 9)
  })

  it('filters by priority', async () => {
    await fetchTickets(undefined, { filters: { priority: [TicketPriority.HIGH] } })
    expect(query.in).toHaveBeenCalledWith('priority', [TicketPriority.HIGH])
    expect(query.in).toHaveBeenCalledTimes(1)
    expect(query.range).toHaveBeenCalledWith(0, 9)
  })

  it('searches ticket titles', async () => {
    await fetchTickets(undefined, { filters: { search: 'test' } })
    expect(query.ilike).toHaveBeenCalledWith('title', '%test%')
    expect(query.ilike).toHaveBeenCalledTimes(1)
  })

  it('requests the requested page and preserves the total', async () => {
    result.count = 25
    const response = await fetchTickets(undefined, { pagination: { page: 2, pageSize: 10 } })
    expect(query.range).toHaveBeenCalledWith(10, 19)
    expect(response).toEqual({ data: [], total: 25 })
  })

  it('propagates fetch errors instead of returning an empty success', async () => {
    result = { data: null, count: null, error: new Error('Failed to fetch tickets') }
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(fetchTickets(undefined)).rejects.toBe(result.error)
      expect(query.range).toHaveBeenCalledWith(0, 9)
    } finally {
      log.mockRestore()
    }
  })
})
