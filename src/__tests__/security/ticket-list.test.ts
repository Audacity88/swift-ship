import { GET } from '@/app/api/tickets/route'
import { createServerClient } from '@supabase/ssr'
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('next/headers', () => ({ cookies: async () => ({ get: jest.fn() }) }))
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init: any = {}) => ({ status: init.status || 200, body }) } }))
let query: any
beforeEach(() => {
  query = {}
  for (const method of ['select', 'eq', 'in', 'is', 'ilike', 'gte', 'lte', 'order', 'range']) {
    query[method] = jest.fn(() => query)
  }
  query.then = (resolve: any) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve)
  const role: any = { select: () => role, eq: () => role, maybeSingle: async () => ({ data: null, error: null }) }
  ;(createServerClient as jest.Mock).mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    from: (table: string) => table === 'agents' ? role : query,
  })
})
const run = (search = '') => GET({ url: `http://localhost/api/tickets${search}`, headers: { get: () => null } } as any)
it('accepts omitted type and scopes customers with default pagination', async () => {
  expect((await run()).status).toBe(200)
  expect(query.eq).toHaveBeenCalledWith('customer_id', 'owner')
  expect(query.range).toHaveBeenCalledWith(0, 9)
})
it('applies type/search/dates/page and sort direction', async () => {
  expect((await run('?type=problem&search=missing&dateFrom=2026-01-01&dateTo=2026-02-01&page=2&pageSize=1&sortDirection=asc')).status).toBe(200)
  expect(query.eq).toHaveBeenCalledWith('type', 'problem')
  expect(query.ilike).toHaveBeenCalledWith('title', '%missing%')
  expect(query.gte).toHaveBeenCalledWith('created_at', '2026-01-01')
  expect(query.lte).toHaveBeenCalledWith('created_at', '2026-02-01')
  expect(query.range).toHaveBeenCalledWith(1, 1)
  expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
})
it.each(['?page=0', '?page=1.5', '?pageSize=101', '?sortField=unknown', '?sortDirection=sideways'])('rejects invalid query %s', async (search) => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  expect((await run(search)).status).toBe(400)
  expect(query.range).not.toHaveBeenCalled()
  log.mockRestore()
})
