'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Agents page error:', error)
  }, [error])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Agents</h2>
          <p className="text-gray-600 mb-6">
            {error.message || 'Failed to load the agents list. Please try again.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: COLORS.primary }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
} 