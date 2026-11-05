'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase-client'
import { ensureUserProfile, PROFILE_MISSING_MESSAGE } from '@/lib/auth/profile'
import { RoleType } from '@/types/role'

export interface User {
  id: string
  email: string
  name: string
  role: RoleType
  avatar?: string | null
  phone?: string | null
  company?: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const signOut = async () => {
    const { error: signOutError } = await getBrowserSupabase().auth.signOut()
    if (signOutError) {
      setError('Unable to sign out. Please try again.')
      return false
    }
    setUser(null)
    router.replace('/auth/signin')
    router.refresh()
    return true
  }

  useEffect(() => {
    let mounted = true
    let revision = 0
    const supabase = getBrowserSupabase()

    const loadUser = async () => {
      const currentRevision = ++revision
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
          if (mounted && currentRevision === revision) {
            setUser(null)
            setError(null)
          }
          return
        }
        const profile = await ensureUserProfile(supabase, authUser)
        if (mounted && currentRevision === revision) {
          setUser(profile)
          setError(null)
        }
      } catch {
        if (mounted && currentRevision === revision) {
          setUser(null)
          setError(PROFILE_MISSING_MESSAGE)
        }
      } finally {
        if (mounted && currentRevision === revision) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        revision++
        if (mounted) {
          setUser(null)
          setError(null)
          setLoading(false)
        }
      } else {
        // Supabase auth calls must run after the callback releases its auth lock.
        setTimeout(() => { if (mounted) void loadUser() }, 0)
      }
    })
    void loadUser()
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return { user, loading, error, signOut }
}
