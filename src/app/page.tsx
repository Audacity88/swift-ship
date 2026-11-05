'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function RootPage() {
  const router = useRouter()
  const { user, loading, error } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace(user.role === 'customer' ? '/home' : '/tickets/overview')
    } else {
      router.replace(error ? '/auth/signin?error=profile_missing' : '/auth/signin')
    }
  }, [user, loading, error, router])

  return (
    <div className={cn(
      "min-h-screen w-full flex items-center justify-center",
      "bg-background text-foreground"
    )}>
      <div className={cn(
        "p-8 rounded-lg",
        "bg-card text-card-foreground",
        "border border-border"
      )}>
        <div className="w-8 h-8 border-2 border-primary rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  )
}
