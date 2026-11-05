'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase-client'
import { ensureUserProfile } from '@/lib/auth/profile'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    let mounted = true
    const finish = async () => {
      try {
        const supabase = getBrowserSupabase()
        const code = new URL(window.location.href).searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) throw new Error('Authentication failed')
        const profile = await ensureUserProfile(supabase, user)
        if (mounted) router.replace(profile.type === 'agent' ? '/tickets/overview' : '/portal/welcome')
      } catch {
        if (mounted) router.replace('/auth/signin?error=profile_missing')
      }
    }
    void finish()
    return () => { mounted = false }
  }, [router])
  return <p className="p-6" role="status">Completing sign in...</p>
}
