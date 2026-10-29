import { checkUserPermissions, checkPermissions } from '@/lib/auth/check-permissions'
import { getRouteSupabase } from '@/lib/supabase-server'
import { getServerSupabase } from '@/lib/supabase-client'
import { Permission } from '@/types/role'

jest.mock('@/lib/supabase-server', () => ({ getRouteSupabase: jest.fn() }))
jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))

function client(user: { id: string } | null, permissions: string[] = []) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: jest.fn((table: string) => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => table === 'role_permissions'
          ? Promise.resolve({ data: permissions.map(permission => ({ permission })), error: null }) : chain),
        single: jest.fn().mockResolvedValue({ data: { role_id: 'support-role' }, error: null }),
      }
      return chain
    }),
  }
}

beforeEach(() => jest.clearAllMocks())

it('returns 401 for signed-out requests before querying roles', async () => {
  const supabase = client(null)
  ;(getRouteSupabase as jest.Mock).mockResolvedValue(supabase)
  expect(await checkUserPermissions(Permission.MANAGE_TEAMS)).toEqual({ error: 'Unauthorized', status: 401 })
  expect(supabase.from).not.toHaveBeenCalled()
})

it('allows only the requested stored permission', async () => {
  ;(getRouteSupabase as jest.Mock).mockResolvedValue(client({ id: 'agent' }, [Permission.MANAGE_TEAMS]))
  expect(await checkUserPermissions(Permission.MANAGE_TEAMS)).toEqual({ user: { id: 'agent', type: 'agent' } })
  ;(getRouteSupabase as jest.Mock).mockResolvedValue(client({ id: 'agent' }, []))
  expect(await checkUserPermissions(Permission.MANAGE_TEAMS)).toEqual({ error: 'Insufficient permissions', status: 403 })
})

it('uses request cookies when legacy context is absent and preserves explicit Pages context', async () => {
  ;(getRouteSupabase as jest.Mock).mockResolvedValue(client({ id: 'agent' }, ['one']))
  expect(await checkPermissions(undefined, ['one', 'two'])).toBe(false)
  const context: any = { req: { cookies: {} }, res: {} }
  ;(getServerSupabase as jest.Mock).mockReturnValue(client({ id: 'agent' }, ['one', 'two']))
  expect(await checkPermissions(context, ['one', 'two'])).toBe(true)
  expect(getServerSupabase).toHaveBeenCalledWith(context)
})
