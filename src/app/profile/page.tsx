'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { USER_ROLE_LABELS } from '@/types/role'

export default function ProfilePage() {
  const { user, loading, error } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (loading) return
    if (!user) router.replace(error ? '/auth/signin?error=profile_missing' : '/auth/signin')
    else if (user.role === 'customer') router.replace('/portal/profile')
  }, [user, loading, error, router])
  if (loading || !user || user.role === 'customer') return <p className="p-6">Loading your profile...</p>
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <dl className="space-y-3">
        <div><dt className="font-medium">Name</dt><dd>{user.name}</dd></div>
        <div><dt className="font-medium">Email</dt><dd className="break-all">{user.email}</dd></div>
        <div><dt className="font-medium">Role</dt><dd>{USER_ROLE_LABELS[user.role]}</dd></div>
      </dl>
      <p className="text-muted-foreground">An administrator can update staff profiles in Settings, Agents.</p>
    </main>
  )
}
