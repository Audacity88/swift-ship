import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketList from '@/components/features/tickets/TicketList'
import { fetchTickets } from '@/lib/services/ticket-service'

jest.mock('@/lib/services/ticket-service')

// Mock data
const mockTickets = [
  {
    id: '1',
    title: 'Test Ticket 1',
    status: 'open',
    priority: 'high',
    created_at: '2024-01-21T08:00:00Z',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    assignee: {
      name: 'Agent Smith',
      email: 'agent@example.com',
    },
  },
  {
    id: '2',
    title: 'Test Ticket 2',
    status: 'in_progress',
    priority: 'medium',
    created_at: '2024-01-21T09:00:00Z',
    customer: {
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    assignee: {
      name: 'Agent Johnson',
      email: 'johnson@example.com',
    },
  },
]

describe('TicketList Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    (fetchTickets as jest.Mock).mockResolvedValue({ data: mockTickets, pagination: { total: 2 } })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders ticket list with data', async () => {
    render(<TicketList />)

    await waitFor(() => {
      expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
      expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
    })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Agent Smith')).toBeInTheDocument()
    expect(screen.getAllByText(/high|medium/i)).toHaveLength(2)
  })

  it('handles filtering by status', async () => {
    render(<TicketList />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Change the status filter
    const { handleStatusChange } = (window as any).__TEST_HANDLERS__
    handleStatusChange('open')

    await waitFor(() => {
      expect(fetchTickets).toHaveBeenCalledWith({
        filters: { status: ['open'] },
        page: 1
      })
    })
  })

  it('handles filtering by priority', async () => {
    render(<TicketList />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Change the priority filter
    const { handlePriorityChange } = (window as any).__TEST_HANDLERS__
    handlePriorityChange('high')

    await waitFor(() => {
      expect(fetchTickets).toHaveBeenCalledWith({
        filters: { priority: ['high'] },
        page: 1
      })
    })
  })

  it('handles search input', async () => {
    render(<TicketList />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search tickets/i)
    await user.type(searchInput, 'test')

    await waitFor(() => {
      expect(fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ search: 'test' }),
        })
      )
    })
  })

  it('handles pagination', async () => {
    render(<TicketList />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      )
    })
  })

  it('displays loading state', async () => {
    (fetchTickets as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )
    render(<TicketList />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', async () => {
    (fetchTickets as jest.Mock).mockRejectedValue(new Error('Failed to fetch tickets'))
    render(<TicketList />)

    await waitFor(() => {
      expect(screen.getByText(/error loading tickets/i)).toBeInTheDocument()
    })
  })
}) 