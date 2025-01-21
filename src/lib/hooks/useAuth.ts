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
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setUser(null)
          setLoading(false)
          return
        }

        // Get user data
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        // Check if user is an agent
        const { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (agent) {
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

        // If not an agent, check if user is a customer
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (customer) {
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

        // If user exists in auth but not in agents/customers, create customer record
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

        if (!createError && newCustomer) {
          setUser({
            id: newCustomer.id,
            name: newCustomer.name,
            email: newCustomer.email,
            role: RoleType.CUSTOMER,
            isAgent: false,
            avatar: newCustomer.avatar
          })
        }

        setLoading(false)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        router.replace('/auth/signin')
      } else if (event === 'SIGNED_IN' && session) {
        setLoading(true)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        // Check if user is an agent
        const { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (agent) {
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

        // If not an agent, must be a customer
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (customer) {
          setUser({
            id: customer.id,
            name: customer.name || authUser.email?.split('@')[0] || 'Customer',
            email: customer.email || authUser.email || '',
            role: RoleType.CUSTOMER,
            isAgent: false,
            avatar: customer.avatar
          })
        }
        
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return { 
    user, 
    loading,
    signOut: async () => {
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

      // Always redirect to sign in
      router.replace('/auth/signin')
      return true
    }
  }
} 