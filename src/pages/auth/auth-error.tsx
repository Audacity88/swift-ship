import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export default function AuthError() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 mb-8">
              There was a problem authenticating your account. This could be due to an expired or invalid link.
            </p>
            <div className="space-y-4 w-full">
              <Link
                href="/auth/signin"
                className="flex w-full justify-center rounded-lg px-3 py-2 text-sm \
                  font-semibold text-white shadow-sm hover:bg-primary/90 \
                  focus-visible:outline focus-visible:outline-2 \
                  focus-visible:outline-offset-2 focus-visible:outline-primary \
                  transition-colors"
                style={{ backgroundColor: COLORS.primary }}
              >
                Return to Sign In
              </Link>
              <Link
                href="/auth/reset-password"
                className="flex w-full justify-center rounded-lg px-3 py-2 text-sm \
                  font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 \
                  hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 \
                  focus-visible:outline-offset-2 focus-visible:outline-primary \
                  transition-colors"
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 