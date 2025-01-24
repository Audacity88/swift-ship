import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { RoleType } from '@/types/role'

// Debug logger with consistent format
const log = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      if (data && typeof data === 'string') {
        data = data.substring(0, 20) + '...'
      }
      console.log(`[Auth Debug] ${message}`, data ? data : '')
    }
  },
  warn: (message: string, data?: any) => {
    if (data && typeof data === 'string') {
      data = data.substring(0, 20) + '...'
    }
    console.warn(`[Auth Warning] ${message}`, data ? data : '')
  },
  error: (message: string, error?: any) => {
    console.error(`[Auth Error] ${message}`, error ? error : '')
  }
}

// Cache for project ID and Supabase client
let cachedProjectId: string | null = null
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

// Helper to get project ID from various sources
const getProjectId = () => {
  if (cachedProjectId) return cachedProjectId

  // Try to get from env first
  let projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID

  // If not in env, try to extract from URL
  if (!projectId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const match = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/(?:db|api)\.([^.]+)\.supabase\.(co|net|dev)/) ||
                 process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)
    if (match) {
      projectId = match[1]
    }
  }

  // If still no project ID, try to get it from existing cookie
  if (!projectId && typeof window !== 'undefined') {
    const authCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('sb-') && c.trim().endsWith('-auth-token'))
    
    if (authCookie) {
      const cookieMatch = authCookie.trim().match(/^sb-([^-]+)-auth-token/)
      if (cookieMatch) {
        projectId = cookieMatch[1]
      }
    }
  }

  cachedProjectId = projectId || ''
  return projectId
}

// Create a function to get the client instance
const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient

  const projectId = getProjectId()
  const cookieName = projectId ? `sb-${projectId}-auth-token` : 'sb-auth-token'

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        cookieOptions: {
          name: cookieName,
          lifetime: 60 * 60 * 24 * 7, // 1 week
          domain: typeof window !== 'undefined' ? window.location.hostname : undefined,
          path: '/',
          sameSite: 'lax'
        }
      }
    }
  )

  return supabaseClient
}

export interface User {
  id: string
  email: string
  name: string
  role: RoleType
  avatar?: string | null
}

// Cache for user data
const userCache = new Map<string, User>()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const signOut = async () => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        log.error('Error signing out', error)
        return false
      }

      // Clear caches
      userCache.clear()
      window.localStorage.clear()
      setUser(null)
      setLoading(false)
      router.replace('/auth/signin')
      return true
    } catch (error) {
      log.error('Exception during sign out', error)
      return false
    }
  }

  useEffect(() => {
    let mounted = true
    let initializationInProgress = false
    let lastAuthEvent = ''
    let lastEventTime = 0
    const EVENT_DEBOUNCE = 1000 // Increased to 1 second

    const fetchUserData = async (userId: string, supabase: ReturnType<typeof createBrowserClient>) => {
      // Check cache first
      const cachedUser = userCache.get(userId)
      if (cachedUser) {
        return cachedUser
      }

      // Fetch user data
      const [{ data: agent }, { data: customer }] = await Promise.all([
        supabase.from('agents').select('*').eq('id', userId).maybeSingle(),
        supabase.from('customers').select('*').eq('id', userId).maybeSingle()
      ])

      let userData: User | null = null

      if (agent) {
        userData = {
          id: agent.id,
          email: agent.email,
          name: agent.name,
          role: agent.role,
          avatar: agent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agent.name.toLowerCase())}`
        }
      } else if (customer) {
        userData = {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          role: 'customer',
          avatar: customer.avatar
        }
      }

      if (userData) {
        userCache.set(userId, userData)
      }

      return userData
    }

    const initializeAuth = async () => {
      if (!mounted || initializationInProgress) return
      
      try {
        initializationInProgress = true
        const supabase = getSupabaseClient()
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        const userData = await fetchUserData(session.user.id, supabase)
        
        if (mounted) {
          setUser(userData)
          setLoading(false)
        }
      } catch (error) {
        log.error('Error in auth initialization', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      } finally {
        initializationInProgress = false
      }
    }

    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const now = Date.now()
      
      // More aggressive debouncing of duplicate events
      if (event === lastAuthEvent && now - lastEventTime < EVENT_DEBOUNCE) {
        return
      }
      
      lastAuthEvent = event
      lastEventTime = now

      if (event === 'SIGNED_OUT') {
        userCache.clear()
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event) && session) {
        await initializeAuth()
      }
    })

    // Initial auth check
    void initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return {
    user,
    loading,
    signOut
  }
} 