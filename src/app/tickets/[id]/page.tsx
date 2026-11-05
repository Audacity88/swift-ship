'use client'

import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'
import { StatusTransition } from '@/components/features/tickets/StatusTransition'
import { TicketConversation } from '@/components/features/tickets/TicketConversation'
import {
conversationService,
quoteService,
slaService,
statusWorkflow,
ticketService,
type Ticket as TicketData
} from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'
import { formatTicketStatus } from '@/lib/ticket-labels'
import { cn } from '@/lib/utils'
import type { QuoteRequest } from '@/types/quote'
import { TicketStatus } from '@/types/ticket'
import {
Clock
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect,useRef,useState } from 'react'

export default function TicketPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const liveStatus = useRef<{ ticketId: string; revision: number; status?: TicketStatus }>({ ticketId, revision: 0 })
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [slaStatus, setSlaStatus] = useState<Awaited<ReturnType<typeof slaService.getTicketSLA>>>(null)
  const [isQuoteTicket, setIsQuoteTicket] = useState(false)
  const [quoteData, setQuoteData] = useState<QuoteRequest | null>(null)
  const [isCustomer, setIsCustomer] = useState(false)

  // Dropdown visibility states

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

        // Check if user is a customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        const { data: agent } = await supabase.from('agents').select('id').eq('id', user.id).maybeSingle()
        const isCustomer = !agent && !!customer

        setIsAuthenticated(true)
        setCurrentUserId(user.id)
        setIsCustomer(isCustomer)
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
        console.log('[Ticket Page] Fetching ticket data for ID:', ticketId)
        const revision = liveStatus.current.revision
        const ticketData = await ticketService.getTicket(undefined, ticketId)
        if (!ticketData) {
          setError('Ticket not found')
          setIsLoading(false)
          return
        }

        console.log('[Ticket Page] Received ticket data:', {
          id: ticketData.id,
          tags: ticketData.metadata.tags,
          metadata: ticketData.metadata
        })

        setTicket(liveStatus.current.ticketId === ticketId && liveStatus.current.revision !== revision && liveStatus.current.status
          ? { ...ticketData, status: liveStatus.current.status } : ticketData)
        // Check if this is a quote ticket
        const metadata = ticketData.metadata
        const isQuote = ticketData.type === 'task' && 
          metadata?.destination && 
          metadata?.packageDetails &&
          !metadata?.quotedPrice // Only show quotes without a price

        setIsQuoteTicket(Boolean(isQuote))
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
        console.error('[Ticket Page] Error fetching ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch ticket')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated === true) {
      void fetchTicket()
    }
  }, [isAuthenticated, ticketId])

  useEffect(() => {
    if (!isAuthenticated || !ticketId) return
    let disposed = false
    if (liveStatus.current.ticketId !== ticketId) liveStatus.current = { ticketId, revision: 0 }
    let stop: (() => void) | undefined
    void conversationService.subscribeToTicket(undefined, ticketId, row => {
      if (!disposed) {
        liveStatus.current = { ticketId, revision: liveStatus.current.revision + 1, status: row.status as TicketStatus }
        setTicket(current => current ? { ...current, status: row.status as TicketStatus } : current)
      }
    }).then(unsubscribe => {
      if (disposed) { unsubscribe(); return }
      stop = unsubscribe
      // Reconcile changes committed while the initial ticket request was in flight.
      const revision = liveStatus.current.revision
      void ticketService.getTicket(undefined, ticketId).then(ticket => {
        if (!disposed && ticket) setTicket(liveStatus.current.revision !== revision && liveStatus.current.status
          ? { ...ticket, status: liveStatus.current.status } : ticket)
      }).catch(() => { if (!disposed) setError('Unable to refresh ticket. Please reopen it.') })
    }).catch(error => {
      if (!disposed) setError(error instanceof Error ? error.message : 'Live status updates are unavailable.')
    })
    return () => { disposed = true; stop?.() }
  }, [isAuthenticated, ticketId])

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

  // Handle status change
  const handleStatusChange = async (newStatus: TicketStatus, reason?: string) => {
    if (!ticket) return
    
    try {
      // Get the user's role first
      const supabase = getServerSupabase()
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('id', currentUserId)
        .maybeSingle()

      if (!agent) {
        throw new Error('Could not find agent details')
      }

      await statusWorkflow.executeTransition(
        undefined,
        ticketId,
        ticket.status as TicketStatus,  // Cast to ensure type compatibility
        newStatus,
        {
          id: currentUserId!,
          role: agent.role
        },
        reason
      )

      // Refresh ticket data after status change
      const updatedTicket = await ticketService.getTicket(undefined, ticketId)
      if (!updatedTicket) return
      
      setTicket(updatedTicket)
    } catch (error) {
      console.error('Failed to update status:', error)
      throw error
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
      <div className="mx-auto max-w-3xl">
        <div className="p-6">
          {isCustomer ? (
            <>
              {/* Combined header for customers */}
              <div className="mb-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="min-w-0 break-words text-2xl font-semibold text-gray-900 dark:text-white">
                    {ticket.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      #{ticketId?.slice(0, 8)}
                    </div>
                    <div className={cn(
                      "px-2 py-1 text-sm rounded-full",
                      ticket.status === 'open' 
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {formatTicketStatus(ticket.status)}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Created {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Conversation View - only component shown to customers */}
              <div className="mt-6">
                <TicketConversation
                  ticketId={ticket.id}
                  currentUserId={currentUserId!}
                  isAgent={false}
                  className="h-[calc(100vh-12rem)]"
                />
              </div>
            </>
          ) : (
            <>
              {/* Full agent view with all components */}
              <div className="mb-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="min-w-0 break-words text-2xl font-semibold text-gray-900 dark:text-white">
                    {ticket.title}
                  </h1>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        #{ticketId?.slice(0, 8)}
                      </div>
                      <StatusTransition
                        ticketId={ticket.id}
                        currentStatus={ticket.status}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Created {new Date(ticket.createdAt).toLocaleString()}
                </div>
                {/* SLA Status Display - only for agents */}
                {slaStatus && (
                  <div className="mt-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${
                        slaStatus.isBreached 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {slaStatus.name}
                      </span>
                      •
                      {slaStatus.isPaused ? (
                        <button
                          onClick={handleResumeSla}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Resume
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePauseSla('Manual pause')}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Pause
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quote Detail View - only for agents */}
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

              {/* Conversation View - for agents */}
              <div className="mt-6">
                <TicketConversation
                  ticketId={ticket.id}
                  currentUserId={currentUserId!}
                  isAgent={true}
                  className="h-[calc(100vh-12rem)]"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 