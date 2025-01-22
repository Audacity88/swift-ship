'use client'

import { useEffect, useState, useRef } from 'react'
import { useSupabase } from '@/app/providers'
import { format } from 'date-fns'
import { Loader2, Send } from 'lucide-react'
import Image from 'next/image'
import { COLORS } from '@/lib/constants'

interface Message {
  id: string
  content: string
  authorId: string
  authorType: 'agent' | 'customer'
  createdAt: string
  author?: {
    name: string
    email: string
    avatar?: string | null
  }
}

interface ConversationViewProps {
  ticketId: string | null
  currentUserId: string
}

export function ConversationView({ ticketId, currentUserId }: ConversationViewProps) {
  const supabase = useSupabase()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!ticketId) return
    
    const loadConversation = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            author_id,
            author_type,
            created_at
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })

        if (error) throw error

        // Fetch author details separately
        const authorPromises = data.map(async (msg) => {
          const { data: authorData } = await supabase
            .from('message_authors')
            .select('name, email')
            .eq('author_id', msg.author_id)
            .eq('author_type', msg.author_type)
            .single()
          
          return {
            id: msg.id,
            content: msg.content,
            authorId: msg.author_id,
            authorType: msg.author_type,
            createdAt: msg.created_at,
            author: authorData ? {
              name: authorData.name,
              email: authorData.email,
              avatar: null
            } : undefined
          }
        })

        const mappedMessages = await Promise.all(authorPromises)
        setMessages(mappedMessages)
      } catch (err: any) {
        console.error('Error loading conversation:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadConversation()

    // Set up real-time subscription
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          const newMessage = payload.new as any
          
          // Fetch author details separately for the new message
          const { data: authorData } = await supabase
            .from('message_authors')
            .select('name, email')
            .eq('author_id', newMessage.author_id)
            .eq('author_type', newMessage.author_type)
            .single()

          setMessages(prev => [...prev, {
            id: newMessage.id,
            content: newMessage.content,
            authorId: newMessage.author_id,
            authorType: newMessage.author_type,
            createdAt: newMessage.created_at,
            author: authorData ? {
              name: authorData.name,
              email: authorData.email,
              avatar: null
            } : undefined
          }])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [ticketId, supabase])

  const handleSendMessage = async () => {
    if (!ticketId || !newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      // First, get the user's type (customer or agent)
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', currentUserId)
        .single()

      const authorType = customer ? 'customer' : 'agent'

      const { error } = await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          content: newMessage.trim(),
          author_id: currentUserId,
          author_type: authorType,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      setNewMessage('')
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSendMessage()
    }
  }

  if (!ticketId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a message to view the conversation
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Thread */}
      <div className="flex-1 p-6 overflow-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.authorId === currentUserId ? 'flex-row-reverse' : ''
            }`}
          >
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src={message.author?.avatar || '/images/default-avatar.png'}
                alt={message.author?.name || 'User'}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div
              className={`flex flex-col max-w-[70%] ${
                message.authorId === currentUserId ? 'items-end' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {message.authorId === currentUserId
                    ? 'You'
                    : message.author?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  message.authorId === currentUserId
                    ? 'bg-primary text-white'
                    : 'bg-gray-100'
                }`}
                style={message.authorId === currentUserId ? { backgroundColor: COLORS.primary } : undefined}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="relative">
          <textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pr-12 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            disabled={isSending}
          />
          <button
            onClick={() => void handleSendMessage()}
            disabled={!newMessage.trim() || isSending}
            className="absolute right-3 bottom-3 p-2 text-primary hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Send className="w-5 h-5" style={{ color: COLORS.primary }} />
          </button>
        </div>
      </div>
    </div>
  )
} 