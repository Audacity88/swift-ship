'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { COLORS } from '@/lib/constants'
import { authService } from '@/lib/services'
import { cn } from '@/lib/utils'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const next = searchParams.get('next')

  useEffect(() => {
    if (message) {
      setError(null)
    }
  }, [message])

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email) {
      errors.email = 'Email is required'
    }
    if (!password) {
      errors.password = 'Password is required'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const result = await authService.signIn({}, {
        email,
        password
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Wait a moment for the session to be fully established
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify session before redirect
      const { user } = await authService.getUser({})
      if (!user) {
        setError('Failed to verify authentication')
        return
      }

      const nextUrl = next || '/'
      console.log('[SignIn] Redirecting to:', nextUrl)
      router.push(nextUrl)
    } catch (err) {
      console.error('[SignIn] Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8",
      "bg-background"
    )}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Or{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-primary hover:text-primary/90 transition-colors"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={cn(
          "py-8 px-4 shadow sm:rounded-lg sm:px-10",
          "bg-card"
        )}>
          <form onSubmit={handleSignIn} className="space-y-6">
            {error && (
              <div className={cn(
                "rounded-lg p-4 text-sm",
                "bg-destructive/10 text-destructive"
              )}>
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                  required
                  suppressHydrationWarning
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-destructive">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                  required
                  suppressHydrationWarning
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-destructive">{validationErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/auth/reset-password"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "shadow-sm transition-colors",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 