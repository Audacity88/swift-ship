'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, Star, MessageSquare, Phone, Mail, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { conversationService } from '@/lib/services'
import { ConversationView } from '@/components/features/inbox/ConversationView'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

// We assume: The "messages" table is joined to "tickets" for the conversation thread.
// We'll fetch: all messages for the logged in user, either as the ticket's customer or as message author.

interface InboxMessage {
  id: string
  ticketId: string
  content: string
  authorId: string
  authorType: 'agent' | 'customer'
  createdAt: string
  ticketTitle: string
  ticketCustomerId: string
}

interface Ticket {
  id: string
  title: string
  status: string
  created_at: string
  customer: {
    id: string
    name: string
    email: string
  }
  messages: Array<{
    id: string
    content: string
    created_at: string
    author_id: string
    author_type: string
  }>
}

export default function InboxPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])

  const loadMessages = async () => {
    if (!user) return // Don't load if we don't have a user yet
    
    setIsLoading(true)
    setError(null)
    try {
      // Get all tickets with their messages
      const tickets = await conversationService.getTicketsWithMessages(undefined, user.id)

      // Map the tickets to the format we need
      const mappedTickets = tickets.map((ticket: Ticket) => ({
        id: ticket.id,
        subject: ticket.title,
        status: ticket.status,
        createdAt: ticket.created_at,
        customer: ticket.customer,
        latestMessage: ticket.messages[0]
      }))

      setTickets(mappedTickets)
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load messages when user changes
  useEffect(() => {
    if (user) {
      void loadMessages()
    } else {
      setError('Not authenticated')
      setIsLoading(false)
    }
  }, [user])

  // Filter messages in memory
  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      msg.ticketTitle.toLowerCase().includes(q) ||
      msg.content.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)] -mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)] -mt-6 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Tickets List */}
      <div className={cn(
        "w-1/3",
        "border-r border-border",
        "overflow-auto"
      )}>
        <div className={cn(
          "p-4",
          "border-b border-border"
        )}>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full p-2",
              "border border-input rounded-lg",
              "bg-background",
              "placeholder:text-muted-foreground"
            )}
          />
        </div>
        <div className="divide-y divide-border">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className={cn(
                "p-4 cursor-pointer",
                "hover:bg-muted/50 transition-colors",
                selectedTicketId === ticket.id && "bg-muted"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm">{ticket.subject || 'No Subject'}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <p className="text-sm text-muted-foreground truncate">
                  {ticket.latestMessage?.content || 'No messages yet'}
                </p>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  ticket.status === 'open' 
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                    : "bg-muted text-muted-foreground"
                )}>
                  {ticket.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex-1">
        <ConversationView
          ticketId={selectedTicketId}
          currentUserId={user?.id || ''}
          title={tickets.find(t => t.id === selectedTicketId)?.subject || 'Untitled Conversation'}
          status={tickets.find(t => t.id === selectedTicketId)?.status || 'open'}
        />
      </div>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        style={{ backgroundColor: COLORS.primary }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
} 