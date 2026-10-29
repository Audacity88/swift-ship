import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getRouteSupabase } from '@/lib/supabase-server'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))

const store = { getAll: jest.fn(), set: jest.fn() }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'portfolio-placeholder'
  ;(cookies as jest.Mock).mockResolvedValue(store)
  ;(createServerClient as jest.Mock).mockReturnValue({ requestClient: true })
})

it('uses request cookies and the public client key rather than a browser or privileged client', async () => {
  store.getAll.mockReturnValue([{ name: 'session', value: 'synthetic-session' }])
  expect(await getRouteSupabase()).toEqual({ requestClient: true })
  expect(cookies).toHaveBeenCalledTimes(1)
  expect(createServerClient).toHaveBeenCalledWith(
    'http://127.0.0.1:54321', 'portfolio-placeholder', expect.any(Object)
  )
  const adapter = (createServerClient as jest.Mock).mock.calls[0][2].cookies
  expect(adapter.getAll()).toEqual([{ name: 'session', value: 'synthetic-session' }])
})

it('keeps request cookie stores isolated and writes every refreshed cookie', async () => {
  const otherStore = { getAll: jest.fn().mockReturnValue([]), set: jest.fn() }
  await getRouteSupabase()
  ;(cookies as jest.Mock).mockResolvedValueOnce(otherStore)
  await getRouteSupabase()
  const firstAdapter = (createServerClient as jest.Mock).mock.calls[0][2].cookies
  const secondAdapter = (createServerClient as jest.Mock).mock.calls[1][2].cookies
  firstAdapter.setAll([
    { name: 'session.0', value: 'first', options: { path: '/', httpOnly: true } },
    { name: 'session.1', value: 'second', options: { maxAge: 0 } },
  ])
  expect(store.set.mock.calls).toEqual([
    ['session.0', 'first', { path: '/', httpOnly: true }],
    ['session.1', 'second', { maxAge: 0 }],
  ])
  expect(secondAdapter.getAll()).toEqual([])
  expect(otherStore.set).not.toHaveBeenCalled()
})
