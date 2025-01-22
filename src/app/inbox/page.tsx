'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, Star, MessageSquare, Phone, Mail, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useSupabase } from '@/app/providers'
import { ConversationView } from '@/components/features/inbox/ConversationView'

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

export default function InboxPage() {
  const supabase = useSupabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  useEffect(() => {
    // On mount, get the logged in user, then fetch messages
    const init = async () => {
      try {
        const sessionRes = await supabase.auth.getSession()
        const session = sessionRes.data.session
        if (!session?.user?.id) {
          setError('Not authenticated')
          setIsLoading(false)
          return
        }
        setUserId(session.user.id)
        // fetch messages
        await loadInbox(session.user.id)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [supabase])

  const loadInbox = async (uid: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Get messages from tickets where user is the customer
      const customerMessages = await supabase
        .from('messages')
        .select(`
          id,
          ticket_id,
          content,
          author_id,
          author_type,
          created_at,
          tickets!inner(id, title, customer_id)
        `)
        .eq('tickets.customer_id', uid);

      // Get messages where user is the author
      const authorMessages = await supabase
        .from('messages')
        .select(`
          id,
          ticket_id,
          content,
          author_id,
          author_type,
          created_at,
          tickets!inner(id, title, customer_id)
        `)
        .eq('author_id', uid);

      if (customerMessages.error) throw customerMessages.error;
      if (authorMessages.error) throw authorMessages.error;

      // Merge and deduplicate messages
      const allMessages = [...(customerMessages.data || []), ...(authorMessages.data || [])];
      const uniqueMessages = Array.from(new Map(allMessages.map(m => [m.id, m])).values());
      
      // Sort by created_at
      const sortedMessages = uniqueMessages.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const mapped: InboxMessage[] = sortedMessages.map((row: any) => ({
        id: row.id,
        ticketId: row.ticket_id,
        content: row.content,
        authorId: row.author_id,
        authorType: row.author_type,
        createdAt: row.created_at,
        ticketTitle: row.tickets.title,
        ticketCustomerId: row.tickets.customer_id
      }))
      setMessages(mapped)
    } catch (err: any) {
      console.error('Error loading inbox:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

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
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Messages List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => setSelectedTicketId(message.ticketId)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                selectedTicketId === message.ticketId ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex gap-3">
                <div className="relative w-10 h-10">
                  {/* We might show an avatar if we have it, else default */}
                  <Image
                    src="/images/default-avatar.png"
                    alt={message.authorId}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate">
                      {message.ticketTitle || 'No Title'}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {/* If user is the author, show "You:" or "Agent:" etc */}
                    {message.authorId === userId ? 'You:' : (message.authorType === 'agent' ? 'Agent:' : 'Customer:')}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex-1 bg-white">
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