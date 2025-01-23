'use client'

import { useEffect, useState, useRef } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Loader2, Send, Paperclip } from 'lucide-react'
import Image from 'next/image'
import { COLORS } from '@/lib/constants'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { conversationService, type Message } from '@/lib/services'

interface ConversationViewProps {
  ticketId: string | null
  currentUserId: string
  isInternalNote?: boolean
  isAgent?: boolean
  onInternalNoteChange?: (value: boolean) => void
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

const formatMessageDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Invalid date'
  
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) {
      return 'Invalid date'
    }
    return format(date, 'MMM d, h:mm a')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

export function ConversationView({ 
  ticketId, 
  currentUserId, 
  isInternalNote = false,
  isAgent = false,
  onInternalNoteChange
}: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
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
        const messages = await conversationService.getMessages({}, ticketId)
        setMessages(messages)
      } catch (err: any) {
        console.error('Error loading conversation:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadConversation()

    // Set up real-time subscription
    let unsubscribe: (() => void) | undefined

    const setupSubscription = async () => {
      try {
        unsubscribe = await conversationService.subscribeToMessages({}, ticketId, (newMessage) => {
          setMessages(prev => [...prev, newMessage])
          // Scroll to bottom after adding new message
          setTimeout(scrollToBottom, 100)
        })
      } catch (err: any) {
        console.error('Error setting up subscription:', err)
        setError(err.message)
      }
    }

    void setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [ticketId])

  const handleSendMessage = async () => {
    if (!ticketId || !newMessage.trim() || isSending) return
    
    // Add validation for currentUserId
    if (!currentUserId) {
      setError('User ID is missing. Please try logging in again.')
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(currentUserId) || !uuidRegex.test(ticketId)) {
      setError('Invalid user or ticket ID format.')
      return
    }

    setIsSending(true)
    setError(null)
    try {
      // Use the isAgent prop to determine author_type
      const authorType = isAgent ? 'agent' : 'customer'

      await conversationService.addMessage({}, ticketId, newMessage.trim(), authorType, attachments)

      setNewMessage('')
      setAttachments([])
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100)
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message. Please try again.')
      
      // Show the error briefly then clear it
      setTimeout(() => setError(null), 3000)
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

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
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
        {messages.map((message) => {
          // For agents, show system messages as their own
          const isOwnMessage = message.author_id === currentUserId || 
            (isAgent && message.author_id === SYSTEM_USER_ID)
          
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/images/default-avatar.png"
                  alt="User"
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div
                className={`flex flex-col max-w-[70%] ${
                  isOwnMessage ? 'items-end' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.author_id === SYSTEM_USER_ID
                      ? 'System'
                      : isOwnMessage
                      ? 'You'
                      : 'User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMessageDate(message.created_at)}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    isOwnMessage
                      ? 'bg-primary text-white'
                      : 'bg-gray-100'
                  }`}
                  style={isOwnMessage ? { backgroundColor: COLORS.primary } : undefined}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        {error && (
          <div className="mb-2 text-sm text-red-500 text-center">
            {error}
          </div>
        )}
        {isAgent && (
          <div className="flex items-center gap-2 mb-4">
            <Switch
              id="internal-note"
              checked={isInternalNote}
              onCheckedChange={onInternalNoteChange}
            />
            <Label htmlFor="internal-note" className="text-sm">Internal Note</Label>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1"
              >
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Remove</span>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <textarea
            placeholder="Type your reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pr-24 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:cursor-not-allowed"
            rows={3}
            disabled={isSending}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <button
              onClick={handleFileSelect}
              disabled={isSending}
              className="p-2 text-primary hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Attach files"
            >
              <Paperclip className="w-5 h-5" style={{ color: COLORS.primary }} />
            </button>
            <button
              onClick={() => void handleSendMessage()}
              disabled={!newMessage.trim() || isSending}
              className="p-2 text-primary hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primary }} />
              ) : (
                <Send className="w-5 h-5" style={{ color: COLORS.primary }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 