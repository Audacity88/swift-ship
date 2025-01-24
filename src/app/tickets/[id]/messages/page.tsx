'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase-client'
import { ConversationView } from '@/components/features/inbox/ConversationView'
import { ticketService } from '@/lib/services'

export default function MessagesPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [ticket, setTicket] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Check auth status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getServerSupabase()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('User verification failed:', userError)
          setIsAuthenticated(false)
          setCurrentUserId(null)
          return
        }

        setIsAuthenticated(true)
        setCurrentUserId(user.id)
      } catch (error) {
        console.error('Auth error:', error)
        setError('Authentication failed')
        setIsAuthenticated(false)
      }
    }
    void checkAuth()
  }, [])

  // Fetch ticket data after authentication
  useEffect(() => {
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return
      
      try {
        const ticketData = await ticketService.getTicket(undefined, ticketId)
        if (!ticketData) {
          setError('Ticket not found')
          return
        }
        setTicket(ticketData)
      } catch (error) {
        console.error('Error fetching ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch ticket')
      }
    }

    if (isAuthenticated === true) {
      void fetchTicket()
    }
  }, [ticketId, isAuthenticated])

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">Please log in to view this conversation</div>
    </div>
  }

  // Show error state
  if (error) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">{error}</div>
    </div>
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      <ConversationView
        ticketId={ticketId}
        currentUserId={currentUserId || ''}
        isAgent={true}
        title={ticket?.title}
        status={ticket?.status}
      />
    </div>
  )
} 