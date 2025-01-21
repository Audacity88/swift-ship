import { createBrowserClient } from '@supabase/ssr'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { withRoleProtection } from '@/lib/auth/withRoleProtection'

jest.mock('@supabase/ssr')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock component for testing
const ProtectedComponent = () => <div>Protected Content</div>

// Create mock roles and permissions
const mockRoles = {
  ADMIN: ['manage_users', 'manage_tickets', 'manage_knowledge_base'],
  AGENT: ['view_tickets', 'update_tickets', 'view_knowledge_base'],
  CUSTOMER: ['view_own_tickets', 'view_knowledge_base'],
}

describe('Role-Based Access Control', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
    },
  }

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createBrowserClient as jest.Mock).mockReturnValue(mockSupabase)
    mockRouter.replace.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Admin Access', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'admin1',
              user_metadata: { role: 'ADMIN' },
            },
          },
        },
        error: null,
      })
    })

    it('allows admin access to protected routes', async () => {
      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })

    it('allows admin access to all features', async () => {
      const features = ['manage_users', 'manage_tickets', 'manage_knowledge_base']
      features.forEach(async (feature) => {
        const ProtectedFeature = withRoleProtection(ProtectedComponent, ['ADMIN'], [feature])
        render(<ProtectedFeature />)

        await waitFor(() => {
          expect(screen.getByText('Protected Content')).toBeInTheDocument()
        })
      })
    })
  })

  describe('Agent Access', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'agent1',
              user_metadata: { role: 'AGENT' },
            },
          },
        },
        error: null,
      })
    })

    it('prevents agent access to user management', async () => {
      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  describe('Customer Access', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'customer1',
              user_metadata: { role: 'CUSTOMER' },
            },
          },
        },
        error: null,
      })
    })

    it('prevents customer access to all tickets', async () => {
      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN', 'AGENT'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  describe('Unauthenticated Access', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
    })

    it('redirects to sign in for unauthenticated users', async () => {
      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles session error gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'))
      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('handles invalid role gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user1',
              user_metadata: { role: 'INVALID_ROLE' },
            },
          },
        },
      })

      const ProtectedRoute = withRoleProtection(ProtectedComponent, ['ADMIN'])
      render(<ProtectedRoute />)

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })
}) 