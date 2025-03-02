'use client'

import { useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import Link from 'next/link'

function ForbiddenContent() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path')

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-4">
        You don&apos;t have permission to access this page.
      </p>
      {path && (
        <div className="mt-2 p-2 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-700">
            Attempted to access: <code className="bg-gray-200 px-1 py-0.5 rounded">{path}</code>
          </p>
        </div>
      )}
      <div className="mt-6">
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Return to Home
        </Link>
      </div>
    </div>
  )
}

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Loading...</p>
        </div>
      }>
        <ForbiddenContent />
      </Suspense>
    </div>
  )
} 