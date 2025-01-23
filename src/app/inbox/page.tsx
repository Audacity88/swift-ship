'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, Star, MessageSquare, Phone, Mail, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { authService, conversationService } from '@/lib/services'
import { ConversationView } from '@/components/features/inbox/ConversationView'
import { format } from 'date-fns'
import type { ServerContext } from '@/lib/supabase-client'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])

  const loadMessages = async () => {
    if (!userId) return // Don't load if we don't have a userId yet
    
    setIsLoading(true)
    setError(null)
    try {
      // Get all tickets with their messages
      const tickets = await conversationService.getTicketsWithMessages(undefined, userId)

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

  useEffect(() => {
    // On mount, get the logged in user, then fetch messages
    const init = async () => {
      try {
        const session = await authService.getSession(undefined)
        if (!session?.user?.id) {
          setError('Not authenticated')
          setIsLoading(false)
          return
        }
        setUserId(session.user.id)
      } catch (err: any) {
        setError(err.message)
        setIsLoading(false)
      }
    }
    void init()
  }, [])

  // Add a new useEffect to trigger loadMessages when userId changes
  useEffect(() => {
    if (userId) {
      void loadMessages()
    }
  }, [userId])

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
      <div className="w-1/3 border-r border-gray-200 overflow-auto">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div className="divide-y divide-gray-200">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className={`p-4 hover:bg-gray-50 cursor-pointer ${
                selectedTicketId === ticket.id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm">{ticket.subject || 'No Subject'}</h3>
                <span className="text-xs text-gray-500">
                  {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <p className="text-sm text-gray-600 truncate">
                  {ticket.latestMessage?.content || 'No messages yet'}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  ticket.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
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
          currentUserId={userId || ''}
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