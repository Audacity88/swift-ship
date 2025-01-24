'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { COLORS } from '@/lib/constants'
import { authService } from '@/lib/services'
import { cn } from '@/lib/utils'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!name.trim()) {
      setError('Name is required')
      setLoading(false)
      return
    }

    try {
      await authService.registerCustomer({}, {
        email,
        password,
        name,
        company: company.trim() || undefined
      })

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn(
        "min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8",
        "bg-background"
      )}>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We&apos;ve sent you a confirmation link. Please check your email to complete your registration.
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/auth/signin"
              className="font-medium text-primary hover:text-primary/90 transition-colors"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8",
      "bg-background"
    )}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            className="font-medium text-primary hover:text-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={cn(
          "py-8 px-4 shadow sm:rounded-lg sm:px-10",
          "bg-card"
        )}>
          <form className="space-y-6" onSubmit={handleSignUp}>
            {error && (
              <div className={cn(
                "rounded-lg p-4 text-sm",
                "bg-destructive/10 text-destructive"
              )}>
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  spellCheck="false"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "placeholder:text-muted-foreground"
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "placeholder:text-muted-foreground"
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium">
                Company (Optional)
              </label>
              <div className="mt-1">
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  spellCheck="false"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "placeholder:text-muted-foreground"
                  )}
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  spellCheck="false"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "placeholder:text-muted-foreground"
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  spellCheck="false"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm",
                    "bg-background border border-input",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "placeholder:text-muted-foreground"
                  )}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex w-full justify-center rounded-lg px-3 py-2 text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "shadow-sm transition-colors",
                  "hover:bg-primary/90",
                  "focus-visible:outline focus-visible:outline-2",
                  "focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 