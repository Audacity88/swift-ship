import { DELETE } from '@/app/api/shipments/[id]/route'
import { getRouteSupabase } from '@/lib/supabase-server'

jest.mock('@/lib/supabase-server', () => ({ getRouteSupabase: jest.fn() }))
jest.mock('next/server', () => {
  class NextResponse {
    status: number
    constructor(_body: unknown, init: any = {}) { this.status = init.status || 200 }
    static json(_body: unknown, init: any = {}) { return new NextResponse(null, init) }
  }
  return { NextResponse }
})
let user: any
let role: string | null
let roleError: any
let remove: jest.Mock
let from: jest.Mock
beforeEach(() => {
  user = { id: 'user' }; role = null; roleError = null; remove = jest.fn()
  from = jest.fn(() => {
    const query: any = { select: () => query, delete: () => { remove(); return query },
      eq: () => query, maybeSingle: async () => ({ data: role ? { role } : null, error: roleError }),
      then: (resolve: any) => Promise.resolve({ error: null }).then(resolve) }
    return query
  })
  ;(getRouteSupabase as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from })
})
const run = () => DELETE({} as Request, { params: { id: 'shipment' } })
it('rejects anonymous deletion before any database call', async () => {
  user = null
  expect((await run()).status).toBe(401)
  expect(from).not.toHaveBeenCalled()
})
it.each([null, 'agent', 'customer'])('denies deletion for role %s', async (value) => {
  role = value
  expect((await run()).status).toBe(403)
  expect(remove).not.toHaveBeenCalled()
})
it('fails closed on a role query error', async () => {
  role = 'admin'; roleError = new Error('query failed')
  expect((await run()).status).toBe(403)
  expect(remove).not.toHaveBeenCalled()
})
it('allows a verified admin to delete events and shipment', async () => {
  role = 'admin'
  expect((await run()).status).toBe(204)
  expect(remove).toHaveBeenCalledTimes(2)
})
