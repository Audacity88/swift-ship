import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { COLORS } from '@/lib/constants'
import { generatePKCEChallenge } from '@/lib/auth/pkce'
import { authService } from '@/lib/services'

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
      // Generate PKCE challenge
      const { codeVerifier, codeChallenge } = await generatePKCEChallenge()
      
      // Store code verifier securely in session storage (will be cleared after use)
      sessionStorage.setItem('pkce_code_verifier', codeVerifier)

      const result = await authService.signIn({}, {
        email,
        password,
        pkceVerifier: codeVerifier,
        pkceChallenge: codeChallenge,
        pkceChallengeMethod: 'S256'
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Clear PKCE verifier
      sessionStorage.removeItem('pkce_code_verifier')

      router.push('/')
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Sign in error:', err)
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