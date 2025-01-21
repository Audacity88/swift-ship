'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AdminSetup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up admin')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Admin Setup</h1>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>
            Admin setup successful! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <p className="text-gray-600">
          Click the button below to set up your account as an admin. This will grant you full access to the system.
        </p>

        <Button
          onClick={handleSetup}
          disabled={loading || success}
          className="w-full"
        >
          {loading ? 'Setting up...' : 'Set Up Admin Access'}
        </Button>
      </div>
    </div>
  )
} 