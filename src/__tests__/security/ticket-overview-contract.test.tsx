import { act, fireEvent, render, screen } from '@testing-library/react'
import TicketsOverviewPage from '@/app/tickets/overview/page'
import { createTicket, fetchTickets } from '@/lib/services'

const toast = jest.fn()
const router = { push: jest.fn(), refresh: jest.fn() }
const queries: any[] = []
let submit: any
jest.mock('@/lib/services', () => ({ createTicket: jest.fn(), fetchTickets: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => router }))
jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@tanstack/react-query', () => ({ useQuery: (options: any) => { queries.push(options); return { data: undefined, isLoading: false } } }))
jest.mock('@/components/features/tickets/TicketList', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/features/tickets/CreateTicketForm', () => ({ CreateTicketForm: ({ onSubmit }: any) => { submit = onSubmit; return null } }))

it('passes date filters and creation payload after the browser context argument', async () => {
  render(<TicketsOverviewPage />)
  const listing = queries.find(query => query.queryKey[0] === 'tickets')
  await listing.queryFn()
  expect(fetchTickets).toHaveBeenCalledWith(undefined, expect.objectContaining({ filters: { dateFrom: expect.any(String), dateTo: expect.any(String) }, pagination: { page: 1, pageSize: 10 } }))
  fireEvent.click(screen.getByRole('button', { name: 'New Ticket' }))
  await act(async () => submit({ title: '  Help  ', description: '  Details  ', priority: 'medium', customerId: 'customer' }))
  expect(createTicket).toHaveBeenCalledWith(undefined, expect.objectContaining({ title: 'Help', description: 'Details', customerId: 'customer' }))
})
