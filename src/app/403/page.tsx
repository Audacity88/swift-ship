'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLORS } from '@/lib/constants'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16" style={{ color: COLORS.negative }} />
        </div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-gray-600">
          Sorry, you don't have permission to access this page. Please contact your administrator
          if you believe this is a mistake.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.back()}
            variant="outline"
          >
            Go Back
          </Button>
          <Button
            onClick={() => router.push('/')}
            style={{ backgroundColor: COLORS.primary }}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
} 