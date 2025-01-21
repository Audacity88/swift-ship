import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketList from '@/components/features/tickets/TicketList'
import { fetchTickets } from '@/lib/services/ticket-service'
import { TicketStatus, TicketPriority } from '@/types/enums'
import type { TicketListItem } from '@/types/ticket'

jest.mock('@/lib/services/ticket-service')

// Mock data
const mockTickets: TicketListItem[] = [
  {
    id: '1',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: []
  },
  {
    id: '2',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: []
  }
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
    render(<TicketList tickets={mockTickets} />)

    await waitFor(() => {
      expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
      expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
    })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Agent Smith')).toBeInTheDocument()
    expect(screen.getAllByText(/high|medium/i)).toHaveLength(2)
  })

  it('handles filtering by status', async () => {
    render(<TicketList tickets={mockTickets} />)

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
    render(<TicketList tickets={mockTickets} />)

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
    render(<TicketList tickets={mockTickets} />)

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
    render(<TicketList tickets={mockTickets} />)

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
    
    // Set loading to true initially
    const { rerender } = render(<TicketList tickets={[]} />)
    
    // Trigger a filter change to cause loading state
    const { handleStatusChange } = (window as any).__TEST_HANDLERS__
    handleStatusChange('open')
    
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    (fetchTickets as jest.Mock).mockRejectedValue(new Error('Failed to fetch tickets'))
    render(<TicketList tickets={mockTickets} />)

    await waitFor(() => {
      expect(screen.getByText(/error loading tickets/i)).toBeInTheDocument()
    })
  })
}) 