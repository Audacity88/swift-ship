import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'
import { GET } from '@/app/auth/callback/route'
import SignIn from '@/app/auth/signin/page'
import { authService } from '@/lib/services'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { useRouter, useSearchParams } from 'next/navigation'

jest.mock('@/lib/services', () => ({ authService: { signIn: jest.fn(), getUser: jest.fn() } }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(), useSearchParams: jest.fn() }))
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => ({ headers: new Map([['Location', url.toString()]]), cookies: { set: jest.fn() } }),
  },
}))

describe('local auth destinations', () => {
  it.each([
    null, '', 'javascript:alert(1)', 'https://example.invalid', '//example.invalid',
    '/\\example.invalid', '/%5cexample.invalid', '/%2fexample.invalid',
    '/\n/example.invalid', '/%0d%0a/example.invalid', '/./\/example.invalid',
    '/a/..//example.invalid', '/%zz',
  ])('rejects unsafe next value %p', (value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })

  it('preserves a local path, query and fragment', () => {
    expect(safeRedirectPath('/tickets?status=open#latest')).toBe('/tickets?status=open#latest')
  })

  it.each(['https://example.invalid/', '//example.invalid/', 'javascript:alert(1)', '/tickets'])('constrains callback redirect %s', async (next) => {
    ;(cookies as jest.Mock).mockResolvedValue({ get: jest.fn() })
    ;(createServerClient as jest.Mock).mockReturnValue({ auth: {
      exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    } })
    const response = await GET({ url: `https://app.invalid/auth/callback?code=placeholder&next=${encodeURIComponent(next)}` } as Request)
    expect(response.headers.get('Location')).toBe(`https://app.invalid${next === '/tickets' ? '/tickets' : '/'}`)
  })

  it('awaits request cookies and preserves exchange cookies on recovery redirect', async () => {
    const get = jest.fn().mockReturnValue({ value: 'placeholder' })
    ;(cookies as jest.Mock).mockResolvedValue({ get })
    ;(createServerClient as jest.Mock).mockImplementation((_url, _key, options) => ({ auth: {
      exchangeCodeForSession: jest.fn().mockImplementation(async () => {
        expect(options.cookies.get('test-cookie')).toBe('placeholder')
        options.cookies.set('test-cookie', 'placeholder', {})
        return { data: { session: {} }, error: null }
      }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    } }))
    const response = await GET({ url: 'https://app.invalid/auth/callback?code=placeholder&type=recovery' } as Request)
    expect(response.headers.get('Location')).toBe('https://app.invalid/auth/update-password')
    expect(response.cookies.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-cookie', value: 'placeholder' }))
    expect(get).toHaveBeenCalledWith('test-cookie')
  })

  it.each(['javascript:alert(1)', '//example.invalid/', '/tickets'])('constrains sign-in navigation %s', async (next) => {
    const push = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push })
    ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ next }))
    ;(authService.signIn as jest.Mock).mockResolvedValue({ success: true })
    ;(authService.getUser as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } })
    render(<SignIn />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.invalid' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'placeholder' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(next === '/tickets' ? '/tickets' : '/'))
  })
})
