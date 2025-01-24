'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function AdminSetup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)

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

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError(null)
    setDeleteSuccess(false)

    try {
      const response = await fetch(`/api/auth/users?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      setDeleteSuccess(true)
      setEmail('')
      setTimeout(() => {
        setDeleteSuccess(false)
      }, 3000)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDeleteLoading(false)
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

      <Card>
        <CardHeader>
          <CardTitle>Set Up Admin Access</CardTitle>
          <CardDescription>
            Set up your account as an admin to get full access to the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSetup}
            disabled={loading || success}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Set Up Admin Access'}
          </Button>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>Delete User</CardTitle>
          <CardDescription>
            Remove a user from the authentication system. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          {deleteSuccess && (
            <Alert className="mb-4">
              <AlertDescription>
                User deleted successfully!
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleDeleteUser} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter user email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteLoading || !email}
              className="w-full"
            >
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 