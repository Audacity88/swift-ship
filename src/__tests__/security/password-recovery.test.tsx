import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { authService } from '@/lib/services/auth-service'
import { PasswordReset } from '@/components/features/auth/PasswordReset'
import UpdatePassword from '@/pages/auth/update-password'
import { getServerSupabase } from '@/lib/supabase-client'
import { createBrowserClient } from '@supabase/ssr'

jest.mock('@/lib/supabase-client', () => ({ getServerSupabase: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createBrowserClient: jest.fn() }))
jest.mock('@/lib/services', () => ({ authService: jest.requireActual('@/lib/services/auth-service').authService }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), useSearchParams: () => ({ get: () => 'synthetic-token' }) }))
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
let client: any
beforeEach(() => {
  window.location.hash = ''
  client = { auth: { updateUser: jest.fn(async () => ({ error: null })), resetPasswordForEmail: jest.fn(async () => ({ error: null })),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })), setSession: jest.fn(async () => ({ error: new Error('invalid') })) } }
  ;(getServerSupabase as jest.Mock).mockReturnValue(client)
  ;(createBrowserClient as jest.Mock).mockReturnValue(client)
})
it('updates a password containing @ through updateUser', async () => {
  await authService.updatePassword(undefined, 'Example@12345')
  expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'Example@12345' })
  expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
})
it('requests email recovery explicitly', async () => {
  await authService.resetPassword(undefined, 'synthetic@example.invalid')
  expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('synthetic@example.invalid', { redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password` })
  expect(client.auth.updateUser).not.toHaveBeenCalled()
})
it('dispatches reset-mode form to password update', async () => {
  render(<PasswordReset />)
  fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Example@12345' } })
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Example@12345' } })
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))
  await waitFor(() => expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'Example@12345' }))
  expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
})
it.each([false, true])('leaves invite verification loading state on invalid auth (hash %s)', async (hash) => {
  if (hash) window.location.hash = '#access_token=synthetic-token'
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  render(<UpdatePassword />)
  await waitFor(() => expect(screen.getByText(hash ? 'Invalid or expired token' : 'Please use a valid invite link')).toBeInTheDocument())
  expect(screen.queryByText('Verifying your invite...')).not.toBeInTheDocument()
  log.mockRestore()
})
