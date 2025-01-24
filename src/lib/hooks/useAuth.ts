import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { RoleType } from '@/types/role'

// Create Supabase client outside the hook to prevent recreation
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Debug logger with consistent format
const log = {
  debug: (message: string, data?: any) => {
    console.log(`${message}`, data ? data : '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[Auth Warning] ${message}`, data ? data : '')
  },
  error: (message: string, error?: any) => {
    console.error(`[Auth Error] ${message}`, error ? error : '')
  }
}

export interface User {
  id: string
  name: string
  email: string
  role: RoleType
  isAgent: boolean
  avatar_url?: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  // Add signOut function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        log.error('Error signing out', error)
        return false
      }
      return true
    } catch (error) {
      log.error('Exception during sign out', error)
      return false
    }
  }

  // Add debug logging for slow auth
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        log.warn('Auth state still loading after 1 second', {
          user,
          loading,
          initialized,
          timestamp: new Date().toISOString()
        })
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [loading, user, initialized])

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let initializationInProgress = false

    const initializeAuth = async () => {
      if (!mounted || initialized || initializationInProgress) {
        log.debug('Skipping auth initialization', { mounted, initialized, initializationInProgress })
        return
      }
      initializationInProgress = true
      log.debug('Starting auth initialization...')

      try {
        // Get authenticated user data
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
        log.debug('User check result', { 
          hasUser: !!authUser, 
          error: userError?.message,
          userId: authUser?.id 
        })
        
        if (!authUser || userError) {
          log.debug('No valid user found, setting user to null')
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        if (!authUser?.id || !authUser?.email) {
          log.debug('Invalid auth user data', { id: authUser?.id, email: authUser?.email })
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        // First check if user is a customer since that's more likely
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
        log.debug('Customer check result', { 
          hasCustomer: !!customer, 
          error: customerError?.message,
          customerId: customer?.id 
        })

        if (customer && !customerError) {
          log.debug('Setting user as existing customer')
          if (!mounted) return
          setUser({
            id: customer.id,
            name: customer.name || authUser.email?.split('@')[0] || 'Customer',
            email: customer.email || authUser.email,
            role: RoleType.CUSTOMER,
            isAgent: false,
            avatar_url: customer.avatar
          })
          setLoading(false)
          setInitialized(true)
          return
        }

        // If not a customer, check if agent
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
        log.debug('Agent check result', { 
          hasAgent: !!agent, 
          error: agentError?.message,
          agentId: agent?.id 
        })

        if (agent && !agentError) {
          log.debug('Setting user as existing agent')
          if (!mounted) return
          setUser({
            id: agent.id,
            name: agent.name || authUser.email?.split('@')[0] || 'Agent',
            email: agent.email || authUser.email,
            role: agent.role || RoleType.AGENT,
            isAgent: true,
            avatar_url: agent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agent.name.toLowerCase())}`
          })
          setLoading(false)
          setInitialized(true)
          return
        }

        // Only create a new customer if neither customer nor agent record exists
        if (!customer && !customerError && !agent && !agentError) {
          log.debug('Creating new customer record', { userId: authUser.id })
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Customer',
              email: authUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .maybeSingle()
          log.debug('Customer creation result', { success: !!newCustomer, error: createError })

          if (!createError && newCustomer && mounted) {
            log.debug('Setting user as new customer')
            setUser({
              id: newCustomer.id,
              name: newCustomer.name,
              email: newCustomer.email,
              role: RoleType.CUSTOMER,
              isAgent: false,
              avatar_url: newCustomer.avatar
            })
            setLoading(false)
            setInitialized(true)
            return
          }
        }
      } catch (error) {
        log.error('Error in user type check', error)
      }

      // If we get here, something went wrong
      log.error('Failed to initialize user')
      if (mounted) {
        setUser(null)
        setLoading(false)
        setInitialized(true)
      }
    }

    // Start initialization
    initializeAuth()

    return () => {
      mounted = false
    }
  }, [initialized]) // Only depend on initialized state

  // Handle auth state changes
  useEffect(() => {
    if (!initialized) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log.debug('Auth state changed', { event, hasSession: !!session })
      
      if (event === 'SIGNED_OUT') {
        log.debug('Processing sign out')
        setUser(null)
        setLoading(false)
        router.replace('/auth/signin')
        return
      }

      if (event === 'SIGNED_IN') {
        log.debug('Processing sign in')
        setLoading(true)

        try {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
          if (!authUser || userError) {
            log.error('Failed to get authenticated user', userError)
            setUser(null)
            setLoading(false)
            return
          }

          // Check if user is an agent
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          if (agent && !agentError) {
            const role = agent.role.toUpperCase() as keyof typeof RoleType
            setUser({
              id: agent.id,
              name: agent.name || authUser.email?.split('@')[0] || 'Agent',
              email: agent.email || authUser.email || '',
              role: RoleType[role],
              isAgent: true,
              avatar_url: agent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agent.name.toLowerCase())}`
            })
            setLoading(false)
            return
          }

          // If not an agent or if there was an error checking agents, check if user is a customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          if (customer && !customerError) {
            setUser({
              id: customer.id,
              name: customer.name || authUser.email?.split('@')[0] || 'Customer',
              email: customer.email || authUser.email,
              role: RoleType.CUSTOMER,
              isAgent: false,
              avatar_url: customer.avatar
            })
          } else {
            setUser(null)
          }
        } catch (error) {
          log.error('Error handling auth state change', error)
          setUser(null)
        } finally {
          setLoading(false)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialized, router])

  return {
    user,
    loading,
    signOut
  }
} 