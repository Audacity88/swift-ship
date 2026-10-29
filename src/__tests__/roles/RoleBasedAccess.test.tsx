import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase-client'
import { withRoleProtection } from '@/lib/auth/withRoleProtection'

jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))
// Record destinations without Next's framework redirect exception.
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

describe('Role-Based Access Control', () => {
  const mockGetUser = jest.fn()
  const mockUserRole = jest.fn()
  const mockRole = jest.fn()
  const mockFrom = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null })
    mockUserRole.mockResolvedValue({ data: { role_id: 'role1' }, error: null })
    mockRole.mockResolvedValue({ data: { name: 'ADMIN' }, error: null })
    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: table === 'user_roles' ? mockUserRole : mockRole,
        }),
      }),
    }))
    ;(getServerSupabase as jest.Mock).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  // withRoleProtection returns an async server guard, not a React component.
  // Await every invocation so errors belong to Jest rather than Node's
  // unhandled-rejection handler.
  it.each(['ADMIN', 'AGENT', 'CUSTOMER'])('allows the stored %s role', async (role) => {
    mockRole.mockResolvedValue({ data: { name: role }, error: null })
    const context = { req: { cookies: {} }, res: {} } as Parameters<typeof getServerSupabase>[0]

    await expect(withRoleProtection([role])(context)).resolves.toBeNull()

    expect(getServerSupabase).toHaveBeenCalledWith(context)
    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(mockFrom.mock.calls).toEqual([['user_roles'], ['roles']])
    expect(redirect).not.toHaveBeenCalled()
  })

  it.each(['AGENT', 'CUSTOMER', 'INVALID_ROLE'])('rejects the stored %s role from an admin route', async (role) => {
    mockRole.mockResolvedValue({ data: { name: role }, error: null })

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('redirects unauthenticated users before querying roles', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledWith('/auth/signin')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('handles authentication errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') })

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledWith('/auth/signin')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('handles a rejected authentication request', async () => {
    mockGetUser.mockRejectedValue(new Error('Session error'))

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })

  it('handles a missing user role', async () => {
    mockUserRole.mockResolvedValue({ data: null, error: null })

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledWith('/auth/signin')
    expect(mockRole).not.toHaveBeenCalled()
  })

  it('handles a failed role lookup', async () => {
    mockRole.mockResolvedValue({ data: null, error: new Error('Role error') })

    await withRoleProtection(['ADMIN'])(undefined)

    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })
})
