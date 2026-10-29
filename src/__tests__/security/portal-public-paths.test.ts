import { middleware } from '@/middleware'
import { createServerClient } from '@supabase/ssr'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({ status: 200 }),
    redirect: (url: URL) => ({ status: 307, location: url.href }),
  },
}))

beforeEach(() => jest.clearAllMocks())

it.each(['/portal/auth/register', '/portal/auth/reset-password'])('allows signed-out visitors to %s', async pathname => {
  const response = await middleware({ nextUrl: { pathname }, url: `http://localhost${pathname}` } as any)
  expect(response.status).toBe(200)
  expect(createServerClient).not.toHaveBeenCalled()
})

it.each(['/portal/tickets', '/portal/profile', '/portal/auth/register/private'])('keeps %s behind authentication', async pathname => {
  ;(createServerClient as jest.Mock).mockReturnValue({ auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) } })
  const response: any = await middleware({ nextUrl: { pathname }, url: `http://localhost${pathname}` } as any)
  expect(response.status).toBe(307)
  expect(new URL(response.location).pathname).toBe('/auth/signin')
})
