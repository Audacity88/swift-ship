import { act, render, waitFor } from '@testing-library/react'
import TicketsPage from '@/app/portal/tickets/page'
import { customerTicketService } from '@/lib/services'

let props: any
const toast = jest.fn()
jest.mock('@/lib/services', () => ({ customerTicketService: { getCustomerTickets: jest.fn(), createTicket: jest.fn(), addComment: jest.fn() } }))
jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@/components/features/portal/TicketList', () => ({ TicketList: (value: unknown) => { props = value; return null } }))

beforeEach(() => {
  jest.clearAllMocks()
  ;(customerTicketService.getCustomerTickets as jest.Mock).mockResolvedValue({ tickets: [{ id: 'ticket' }], pagination: { page: 1, limit: 10, total: 23, totalPages: 3 } })
})

it('loads actual service pagination and supplies browser context separately for create/comment', async () => {
  render(<TicketsPage />)
  await waitFor(() => expect(props.isLoading).toBe(false))
  expect(customerTicketService.getCustomerTickets).toHaveBeenCalledWith(undefined, { page: 1, limit: 10 })
  expect(props.pagination).toEqual({ page: 1, limit: 10, total: 23, totalPages: 3 })
  await act(async () => props.onCreateTicket({ description: 'Help' }))
  expect(customerTicketService.createTicket).toHaveBeenCalledWith(undefined, { description: 'Help', priority: 'medium' })
  await act(async () => props.onAddComment('ticket', 'Follow-up'))
  expect(customerTicketService.addComment).toHaveBeenCalledWith(undefined, 'ticket', 'Follow-up')
})

it('updates status through the authorized ticket route and reports rejected updates', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false })
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
  render(<TicketsPage />)
  await waitFor(() => expect(props.isLoading).toBe(false))
  await act(async () => props.onUpdateStatus('ticket/id', 'closed'))
  expect(fetch).toHaveBeenCalledWith('/api/tickets/ticket%2Fid', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"status":"closed"}' })
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }))
  errorLog.mockRestore()
})
