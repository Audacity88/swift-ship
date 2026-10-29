import { canAccessTicket } from '@/lib/auth/ticket-access'
import { GET, PATCH } from '@/app/api/tickets/[id]/route'
import { ticketService } from '@/lib/services/ticket-service'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/supabase-client'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))
jest.mock('next/headers', () => ({ cookies: async () => ({ get: jest.fn() }) }))
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init: any = {}) => ({ status: init.status || 200, body }) } }))

const ticket = { id: 'ticket', customer_id: 'owner', assignee_id: 'assigned', ticket_tags: [] }
let agent: { role: string } | null
let user: { id: string } | null
let writes: jest.Mock
let client: any

beforeEach(() => {
  user = { id: 'stranger' }
  agent = null
  writes = jest.fn()
  client = {
    auth: { getUser: jest.fn(async () => ({ data: { user }, error: null })) },
    from: jest.fn((table: string) => {
      const query: any = {
        select: jest.fn(() => query), eq: jest.fn(() => query),
        update: jest.fn((value) => { writes(value); return query }),
        insert: jest.fn((value) => { writes(value); return query }),
        single: jest.fn(async () => ({ data: table === 'agents' ? agent : ticket, error: null })),
        maybeSingle: jest.fn(async () => ({ data: agent, error: null })),
      }
      return query
    }),
  }
  ;(createServerClient as jest.Mock).mockReturnValue(client)
  ;(getServerSupabase as jest.Mock).mockReturnValue(client)
})
const context = () => ({ params: Promise.resolve({ id: 'ticket' }) })
const request = () => ({ json: async () => ({ status: 'closed' }) } as Request)

it.each([
  ['owner', null, true], ['stranger', null, false],
  ['assigned', { role: 'agent' }, true], ['stranger', { role: 'agent' }, false],
  ['admin', { role: 'admin' }, true],
])('checks persisted identity %s %j', (id, role, allowed) => {
  expect(canAccessTicket(id as string, role as any, ticket)).toBe(allowed)
})
it.each([GET, PATCH])('denies foreign customer at route boundary', async (handler) => {
  expect((await handler(request(), context())).status).toBe(403)
  expect(writes).not.toHaveBeenCalled()
})
it.each([GET, PATCH])('requires authenticated user', async (handler) => {
  user = null
  expect((await handler(request(), context())).status).toBe(401)
  expect(client.from).not.toHaveBeenCalled()
})
it.each([GET, PATCH])('allows the owning customer', async (handler) => {
  user = { id: 'owner' }
  expect((await handler(request(), context())).status).toBe(200)
})
it.each([GET, PATCH])('uses persisted admin role', async (handler) => {
  agent = { role: 'admin' }
  expect((await handler(request(), context())).status).toBe(200)
})
it('denies browser service detail and writes for foreign customers', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  await expect(ticketService.getTicket(undefined, 'ticket')).rejects.toThrow('Forbidden')
  await expect(ticketService.updateTicket(undefined, 'ticket', { status: 'closed' })).rejects.toThrow('Forbidden')
  await expect(ticketService.updateTicketStatus(undefined, 'ticket', 'closed' as any)).rejects.toThrow('Forbidden')
  expect(writes).not.toHaveBeenCalled()
  log.mockRestore()
})
it('fails closed when the role lookup fails', async () => {
  client.from.mockImplementation((table: string) => {
    const query: any = { select: () => query, eq: () => query,
      single: async () => ({ data: ticket, error: null }),
      maybeSingle: async () => ({ data: null, error: new Error('database unavailable') }),
    }
    return query
  })
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  expect((await PATCH(request(), context())).status).toBe(500)
  expect(writes).not.toHaveBeenCalled()
  log.mockRestore()
})
