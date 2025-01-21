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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()

        if (error || !authUser) {
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
          setUser({
            id: agent.id,
            name: agent.name || authUser.email?.split('@')[0] || 'Agent',
            email: agent.email || authUser.email || '',
            role: agent.role as RoleType,
            isAgent: true
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
            isAgent: false
          })
          setLoading(false)
          return
        }

        // If user exists in auth but not in agents/customers, create customer record
        if (!agent && !customer) {
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
              isAgent: false
            })
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error in getUser:', error)
        setUser(null)
        setLoading(false)
      }
    }

    // Initial load
    getUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        // Use replace instead of push to prevent back navigation to protected pages
        router.replace('/auth/signin')
      } else if (event === 'SIGNED_IN' && session) {
        await getUser()
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
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        return false
      }
      return true
    }
  }
} 