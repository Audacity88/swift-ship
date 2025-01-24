'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { 
  FileText, AlertCircle, HelpCircle, Wrench, Check, Clock,
  Tag, Link as LinkIcon, Users, ChevronDown, MessageSquare
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { TicketStatus, TicketPriority } from '@/types/ticket'
import type { Ticket, TicketComment, TicketType } from '@/types/ticket'
import type { User } from '@/types/user'
import type { QuoteRequest } from '@/types/quote'
import { 
  TypeDropdown, 
  PriorityDropdown, 
  TagsDropdown, 
  FollowersDropdown 
} from '@/components/features/tickets/PropertyDropdowns'
import { StatusTransition } from '@/components/features/tickets/StatusTransition'
import { 
  getTicket, 
  updateTicket, 
  updateTicketStatus, 
  slaService,
  authService,
  ticketService,
  quoteService,
  type Ticket as TicketData 
} from '@/lib/services'
import { TicketConversation } from '@/components/features/tickets/TicketConversation'
import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'
import type { ServerContext } from '@/lib/supabase-client'
import { getServerSupabase } from '@/lib/supabase-client'

interface Tag {
  id: string
  name: string
  color: string
}

export default function TicketPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [selectedType, setSelectedType] = useState<TicketType>('problem')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [linkedProblem, setLinkedProblem] = useState<string | null>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [slaStatus, setSlaStatus] = useState<any>(null)
  const [isQuoteTicket, setIsQuoteTicket] = useState(false)
  const [quoteData, setQuoteData] = useState<QuoteRequest | null>(null)

  // Dropdown visibility states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [showFollowersDropdown, setShowFollowersDropdown] = useState(false)

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

  // Only fetch ticket data after authentication is confirmed
  useEffect(() => {
    const fetchTicket = async () => {
      if (!isAuthenticated) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      if (!ticketId || ticketId === 'undefined') {
        setError('Invalid ticket ID')
        setIsLoading(false)
        return
      }

      // Validate UUID format using regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(ticketId)) {
        setError('Invalid ticket ID format')
        setIsLoading(false)
        return
      }
      
      try {
        const ticketData = await ticketService.getTicket(undefined, ticketId)
        if (!ticketData) {
          setError('Ticket not found')
          setIsLoading(false)
          return
        }

        setTicket(ticketData)
        setSelectedType((ticketData.metadata as any)?.type || 'problem')
        setSelectedPriority(ticketData.priority)
        setSelectedAssignee(ticketData.assignee?.id || null)
        setTags((ticketData.metadata as any)?.tags || [])

        // Check if this is a quote ticket
        const metadata = ticketData.metadata as any
        const isQuote = ticketData.type === 'task' && 
          metadata?.destination && 
          metadata?.packageDetails &&
          !metadata?.quotedPrice // Only show quotes without a price

        setIsQuoteTicket(isQuote)
        if (isQuote) {
          const quoteMetadata = metadata as unknown as QuoteRequest['metadata']
          setQuoteData({
            id: ticketData.id,
            title: ticketData.title,
            status: ticketData.status,
            customer: {
              id: ticketData.customerId,
              name: ticketData.customer.name,
              email: ticketData.customer.email
            },
            metadata: quoteMetadata,
            created_at: ticketData.createdAt
          })
        }
      } catch (error) {
        console.error('Error fetching ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch ticket')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated === true) {
      void fetchTicket()
    }
  }, [ticketId, isAuthenticated, tags])

  // Add SLA status fetch
  useEffect(() => {
    const fetchSlaStatus = async () => {
      if (!ticket) return
      try {
        const status = await slaService.getTicketSLA(undefined, ticket.id)
        setSlaStatus(status)
      } catch (error) {
        console.error('Error fetching SLA status:', error)
      }
    }

    if (ticket) {
      void fetchSlaStatus()
      // Refresh SLA status every minute
      const interval = setInterval(fetchSlaStatus, 60000)
      return () => clearInterval(interval)
    }
  }, [ticket])

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">Please log in to view this ticket</div>
    </div>
  }

  // Show loading state while fetching ticket
  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  // Show error state
  if (error || !ticket) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">{error || 'Ticket not found'}</div>
    </div>
  }

  // Tag handlers
  const handleAddTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      const newTag: Tag = {
        id: `tag_${Date.now()}`,
        name: tagName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }

      await ticketService.updateTicket(undefined, ticketId, {
        metadata: {
          ...ticket.metadata,
          tags: [...tags, newTag]
        }
      })
      
      setTags(prev => [...prev, newTag])
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      await ticketService.updateTicket(undefined, ticketId, {
        metadata: {
          ...ticket.metadata,
          tags: tags.filter(t => t.name !== tagName)
        }
      })
      
      setTags(prev => prev.filter(t => t.name !== tagName))
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  // Follower handlers
  const handleAddFollower = async (follower: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/followers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ follower })
      })
      
      if (!response.ok) throw new Error('Failed to add follower')
      
      setFollowers(prev => [...prev, follower])
    } catch (error) {
      console.error('Failed to add follower:', error)
    }
  }

  const handleRemoveFollower = async (follower: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/followers/${encodeURIComponent(follower)}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to remove follower')
      
      setFollowers(prev => prev.filter(f => f !== follower))
    } catch (error) {
      console.error('Failed to remove follower:', error)
    }
  }

  // Handle status change
  const handleStatusChange = async (newStatus: TicketStatus, reason?: string) => {
    if (!ticket) return
    
    try {
      const updatedTicket = await ticketService.updateTicket(undefined, ticketId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })

      if (!updatedTicket) return
      
      setTicket(updatedTicket)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  // Add SLA pause/resume handlers
  const handlePauseSla = async (reason: string) => {
    if (!ticket) return
    try {
      await slaService.pauseSLA(undefined, ticket.id, reason)
      const status = await slaService.getTicketSLA(undefined, ticket.id)
      setSlaStatus(status)
    } catch (error) {
      console.error('Error pausing SLA:', error)
    }
  }

  const handleResumeSla = async () => {
    if (!ticket) return
    try {
      await slaService.resumeSLA(undefined, ticket.id)
      const status = await slaService.getTicketSLA(undefined, ticket.id)
      setSlaStatus(status)
    } catch (error) {
      console.error('Error resuming SLA:', error)
    }
  }

  // Add quote-specific handlers
  const handleSubmitQuote = async (quoteId: string, price: number) => {
    try {
      await quoteService.submitQuote(undefined, quoteId, price)
      // Refresh ticket data
      const updatedTicket = await ticketService.getTicket(undefined, ticketId)
      if (!updatedTicket) return
      
      setTicket(updatedTicket)
      const updatedMetadata = updatedTicket.metadata as unknown as QuoteRequest['metadata']
      setQuoteData({
        id: updatedTicket.id,
        title: updatedTicket.title,
        status: updatedTicket.status,
        customer: {
          id: updatedTicket.customerId,
          name: updatedTicket.customer.name,
          email: updatedTicket.customer.email
        },
        metadata: updatedMetadata,
        created_at: updatedTicket.createdAt
      })
    } catch (error) {
      console.error('Error submitting quote:', error)
    }
  }

  const handleCreateShipment = async (quoteId: string) => {
    if (!quoteData) return

    try {
      const shipmentData = {
        quote_id: quoteId,
        type: 'standard',
        origin: quoteData.metadata.destination.from,
        destination: quoteData.metadata.destination.to,
        scheduled_pickup: quoteData.metadata.destination.pickupDate,
        estimated_delivery: quoteData.metadata.destination.pickupDate
      }
      
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      })

      if (!response.ok) {
        throw new Error('Failed to create shipment')
      }

      // Refresh ticket data after shipment creation
      const updatedTicket = await ticketService.getTicket(undefined, ticketId)
      if (!updatedTicket) return
      
      setTicket(updatedTicket)
      const updatedMetadata = updatedTicket.metadata as unknown as QuoteRequest['metadata']
      setQuoteData({
        id: updatedTicket.id,
        title: updatedTicket.title,
        status: updatedTicket.status,
        customer: {
          id: updatedTicket.customerId,
          name: updatedTicket.customer.name,
          email: updatedTicket.customer.email
        },
        metadata: updatedMetadata,
        created_at: updatedTicket.createdAt
      })
    } catch (error) {
      console.error('Error creating shipment:', error)
    }
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      {/* Main Ticket Content */}
      <div className="max-w-4xl mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {ticket.title}
              </h1>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Created {new Date(ticket.createdAt).toLocaleString()}
              </div>
              {/* Add SLA Status Display */}
              {slaStatus && (
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div className="text-sm">
                    <span className={`font-medium ${
                      slaStatus.isBreached 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {slaStatus.name}
                    </span>
                    {slaStatus.isPaused ? (
                      <button
                        onClick={handleResumeSla}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePauseSla('Manual pause')}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Pause
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <StatusTransition
                ticketId={ticket.id}
                currentStatus={ticket.status}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          {/* Quote Detail View */}
          {isQuoteTicket && quoteData && (
            <div className="mb-6">
              <QuoteDetailView
                quote={quoteData}
                onSubmitQuote={handleSubmitQuote}
                onCreateShipment={handleCreateShipment}
                mode={quoteData.status === 'open' ? 'pending' : 'quoted'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 