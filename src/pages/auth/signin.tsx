import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { COLORS } from '@/lib/constants'
import { generatePKCEChallenge } from '@/lib/auth/pkce'
import { authService } from '@/lib/services'
import { createBrowserClient } from '@supabase/ssr'

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
      console.log('[SignIn] Starting sign in process')
      
      // Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Sign in directly with browser client
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('[SignIn] Sign in error:', error)
        setError(error.message)
        return
      }

      if (!data.session) {
        console.error('[SignIn] No session returned')
        setError('Failed to establish session')
        return
      }

      console.log('[SignIn] Sign in successful, session established')

      // Get the next URL from query params, message, or default to '/'
      let nextUrl = '/'
      
      // If we have a message, add it to the destination
      if (router.query.message) {
        const destination = router.query.next as string || '/'
        const url = new URL(destination, window.location.origin)
        url.searchParams.set('message', router.query.message as string)
        nextUrl = url.pathname + url.search
      } 
      // If we have a next URL that isn't /signin, use it
      else if (router.query.next && router.query.next !== '/signin' && router.query.next !== '/auth/signin') {
        nextUrl = router.query.next as string
      }

      // Verify session one more time
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session || sessionError) {
        console.error('[SignIn] Failed to verify final session:', sessionError)
        setError('Failed to establish session. Please try again.')
        return
      }

      console.log('[SignIn] Session verified, redirecting to:', nextUrl)
      router.push(nextUrl)
    } catch (err) {
      console.error('[SignIn] Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            href="/auth/signup"
            className="font-medium hover:text-primary transition-colors"
            style={{ color: COLORS.primary }}
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSignIn}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                  className="block w-full appearance-none rounded-lg border border-gray-200 \
                    px-3 py-2 placeholder-gray-400 focus:border-primary focus:outline-none \
                    focus:ring-primary sm:text-sm"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  spellCheck="false"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-200 \
                    px-3 py-2 placeholder-gray-400 focus:border-primary focus:outline-none \
                    focus:ring-primary sm:text-sm"
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/auth/reset-password"
                  className="font-medium hover:text-primary transition-colors"
                  style={{ color: COLORS.primary }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg px-3 py-2 text-sm \
                  font-semibold text-white shadow-sm hover:bg-primary/90 \
                  focus-visible:outline focus-visible:outline-2 \
                  focus-visible:outline-offset-2 focus-visible:outline-primary \
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: COLORS.primary }}
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