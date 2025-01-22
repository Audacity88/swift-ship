import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { RoleType } from '@/types/role'

export interface User {
  id: string
  name: string
  email: string
  role: RoleType
  isAgent: boolean
  avatar?: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Add debug logging for slow auth
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth state still loading after 1 second. Debug info:', {
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
        console.log('Skipping auth initialization:', { mounted, initialized, initializationInProgress })
        return
      }
      initializationInProgress = true

      console.log('Starting auth initialization...')
      try {
        // Get initial session and user in one call
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('Session check result:', { 
          hasSession: !!session, 
          error: sessionError?.message,
          userId: session?.user?.id 
        })
        
        if (!session || sessionError) {
          console.log('No valid session found, setting user to null')
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        const authUser = session.user
        if (!authUser?.id || !authUser?.email) {
          console.log('Invalid auth user data:', { id: authUser?.id, email: authUser?.email })
          if (mounted) {
            setUser(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        // First check if user is a customer since that's more likely
        try {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', authUser.id)
            .single()
          console.log('Customer check result:', { 
            hasCustomer: !!customer, 
            error: customerError?.message,
            customerId: customer?.id 
          })

          if (customer && !customerError) {
            console.log('Setting user as existing customer')
            if (mounted) {
              setUser({
                id: customer.id,
                name: customer.name || authUser.email?.split('@')[0] || 'Customer',
                email: customer.email || authUser.email,
                role: RoleType.CUSTOMER,
                isAgent: false,
                avatar: customer.avatar
              })
              setLoading(false)
              setInitialized(true)
              return
            }
          }

          // If not a customer, check if agent
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', authUser.id)
            .single()
          console.log('Agent check result:', { 
            hasAgent: !!agent, 
            error: agentError?.message,
            agentId: agent?.id 
          })

          if (agent && !agentError) {
            console.log('Setting user as existing agent')
            if (mounted) {
              setUser({
                id: agent.id,
                name: agent.name || authUser.email?.split('@')[0] || 'Agent',
                email: agent.email || authUser.email,
                role: agent.role || RoleType.AGENT,
                isAgent: true,
                avatar: agent.avatar
              })
              setLoading(false)
              setInitialized(true)
              return
            }
          }

          // If we get here, the user exists in auth but not in our tables
          console.log('User exists in auth but not in customers/agents tables:', authUser.id)
          // If neither customer nor agent, create customer record
          console.log('Attempting to create new customer record')
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              id: authUser.id,
              name: authUser.user_metadata.name || authUser.email?.split('@')[0] || 'Customer',
              email: authUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          console.log('Customer creation result:', { customer: !!newCustomer, error: createError })

          if (!createError && newCustomer && mounted) {
            console.log('Setting user as new customer')
            setUser({
              id: newCustomer.id,
              name: newCustomer.name,
              email: newCustomer.email,
              role: RoleType.CUSTOMER,
              isAgent: false,
              avatar: newCustomer.avatar
            })
            setLoading(false)
            setInitialized(true)
            return
          }
        } catch (error) {
          console.error('Error in user type check:', error)
        }

        // If we get here, something went wrong
        console.error('Failed to initialize user')
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      } finally {
        initializationInProgress = false
      }
    }

    // Start initialization
    initializeAuth()

    return () => {
      mounted = false
    }
  }, [supabase, initialized])

  // Handle auth state changes
  useEffect(() => {
    if (!initialized) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, session: !!session })
      
      if (event === 'SIGNED_OUT') {
        console.log('Processing sign out')
        setUser(null)
        setLoading(false)
        router.replace('/auth/signin')
        return
      }

      if (event === 'SIGNED_IN' && session) {
        console.log('Processing sign in')
        setLoading(true)

        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) {
            setUser(null)
            setLoading(false)
            return
          }

          // Check if user is an agent
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (agent && !agentError) {
            const role = agent.role.toUpperCase() as keyof typeof RoleType
            setUser({
              id: agent.id,
              name: agent.name || authUser.email?.split('@')[0] || 'Agent',
              email: agent.email || authUser.email || '',
              role: RoleType[role],
              isAgent: true,
              avatar: agent.avatar
            })
            setLoading(false)
            return
          }

          // If not an agent or if there was an error checking agents, check if user is a customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (customer && !customerError) {
            setUser({
              id: customer.id,
              name: customer.name || authUser.email?.split('@')[0] || 'Customer',
              email: customer.email || authUser.email || '',
              role: RoleType.CUSTOMER,
              isAgent: false,
              avatar: customer.avatar
            })
            setLoading(false)
            return
          }

          // If we get here, something went wrong
          console.error('Failed to load user on sign in:', { agentError, customerError })
          setUser(null)
          setLoading(false)
        } catch (error) {
          console.error('Error processing sign in:', error)
          setUser(null)
          setLoading(false)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, initialized])

  return { 
    user, 
    loading,
    signOut: async () => {
      console.log('Starting sign out process')
      // Clear local state immediately
      setUser(null)
      setLoading(false)

      // Clear any auth cookies and local storage
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
      })
      localStorage.clear()
      sessionStorage.clear()

      // Try to sign out from Supabase in the background
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error in Supabase signOut:', error)
      }

      console.log('Completing sign out process')
      // Always redirect to sign in
      router.replace('/auth/signin')
      return true
    }
  }
} 