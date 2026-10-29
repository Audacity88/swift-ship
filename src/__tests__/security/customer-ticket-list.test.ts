import { customerTicketService } from '@/lib/services/customer-ticket-service'
import { getServerSupabase } from '@/lib/supabase-client'

jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))

it('scopes customer tickets, uses database date columns, and maps dates for the UI', async () => {
  const query: any = {}
  for (const method of ['select', 'eq', 'order']) query[method] = jest.fn(() => query)
  query.range = jest.fn().mockResolvedValue({ data: [{ id: 'ticket', created_at: '2026-01-01', updated_at: '2026-02-01', customer_id: 'customer' }], error: null, count: 23 })
  ;(getServerSupabase as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'customer' } }, error: null }) }, from: jest.fn(() => query) })
  const result = await customerTicketService.getCustomerTickets(undefined, { page: 2, limit: 10, sortBy: 'updatedAt', sortOrder: 'asc' })
  expect(query.eq).toHaveBeenCalledWith('customer_id', 'customer')
  expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: true })
  expect(query.range).toHaveBeenCalledWith(10, 19)
  expect(result.pagination).toEqual({ page: 2, limit: 10, total: 23, totalPages: 3 })
  expect(result.tickets[0]).toEqual(expect.objectContaining({ createdAt: '2026-01-01', updatedAt: '2026-02-01', customerId: 'customer' }))
})
