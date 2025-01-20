import { useState } from 'react'
import { useRouter } from 'next/router'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Password updated
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully updated. You will be redirected
              to the sign in page shortly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Update your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleUpdatePassword}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-200 \
                    px-3 py-2 placeholder-gray-400 focus:border-primary focus:outline-none \
                    focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-200 \
                    px-3 py-2 placeholder-gray-400 focus:border-primary focus:outline-none \
                    focus:ring-primary sm:text-sm"
                />
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
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 