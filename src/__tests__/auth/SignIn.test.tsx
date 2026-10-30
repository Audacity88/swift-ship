import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignIn from '@/app/auth/signin/page'
import { authService } from '@/lib/services'

const router = { push: jest.fn() }
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/lib/services', () => ({
  authService: { signIn: jest.fn(), getUser: jest.fn() },
}))

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(authService.signIn).mockResolvedValue({ success: true })
  jest.mocked(authService.getUser).mockResolvedValue({ user: { id: '123' } as any, error: null })
})

async function submitCredentials() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('SignIn Component', () => {
  it('renders sign in form', () => {
    render(<SignIn />)
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(/password/i)).toBeRequired()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('handles form submission and redirects after verifying the session', async () => {
    render(<SignIn />)
    await submitCredentials()
    expect(authService.signIn).toHaveBeenCalledWith({}, {
      email: 'test@example.com', password: 'password123',
    })
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'))
    expect(authService.getUser).toHaveBeenCalledWith({})
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('displays error message on failed sign in', async () => {
    jest.mocked(authService.signIn).mockResolvedValueOnce({ success: false, error: 'Invalid credentials' })
    render(<SignIn />)
    await submitCredentials()
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(authService.getUser).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('validates required fields', async () => {
    render(<SignIn />)
    // Submit directly to exercise application validation in addition to HTML required attributes.
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(authService.signIn).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })
})
