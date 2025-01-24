import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const handleToken = async () => {
      try {
        // Check if we have a token in the URL hash
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          
          if (accessToken) {
            console.log('[UpdatePassword] Found token in URL, setting session')
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            })
            
            if (error) {
              console.error('[UpdatePassword] Error setting session:', error)
              setError('Invalid or expired token')
              return
            }
          }
        }

        // Verify we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          console.error('[UpdatePassword] No valid session:', sessionError)
          setError('Please use a valid invite link')
          return
        }

        console.log('[UpdatePassword] Session verified')
        setLoading(false)
      } catch (err) {
        console.error('[UpdatePassword] Error handling token:', err)
        setError('An error occurred')
      }
    }

    handleToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      })

      if (passwordError) {
        setError(passwordError.message)
        return
      }

      // Clear the force_password_reset flag
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          force_password_reset: false
        }
      })

      if (metadataError) {
        console.error('[UpdatePassword] Error clearing force_password_reset:', metadataError)
        // Continue anyway since password was updated
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin?message=Password updated successfully')
      }, 2000)
    } catch (err) {
      setError('An error occurred while updating your password')
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Verifying your invite...</h1>
        <p className="text-gray-600">Please wait while we verify your invitation.</p>
      </div>
    </div>
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Error</h1>
        <p className="text-red-600">{error}</p>
      </div>
    </div>
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center">Set Your Password</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
} 