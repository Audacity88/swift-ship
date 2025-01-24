'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function RootPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/home')
    } else {
      router.push('/auth/signin')
    }
  }, [user, router])

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
