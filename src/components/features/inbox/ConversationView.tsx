'use client'

import { useEffect, useState, useRef } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Loader2, Send, Paperclip } from 'lucide-react'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { conversationService, type Message } from '@/lib/services'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ATTACHMENT_ACCEPT, UPLOAD_FAILURE_MESSAGE, validateAttachments, type Attachment } from '@/lib/services/conversation-service';
import { formatTicketStatus } from '@/lib/ticket-labels'

interface ConversationViewProps {
  ticketId: string | null
  currentUserId: string
  isInternalNote?: boolean
  isAgent?: boolean
  onInternalNoteChange?: (value: boolean) => void
  title?: string
  status?: string
  hideHeader?: boolean
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
  onInternalNoteChange,
  title = 'Untitled Conversation',
  status = 'open',
  hideHeader = false
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
    if (!ticketId || !currentUserId) return
    let disposed = false
    let unsubscribe: (() => void) | undefined
    setMessages([])
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        // Join first, then fetch so no message can fall between fetch and subscribe.
        const stop = await conversationService.subscribeToMessages(undefined, ticketId, message => {
          if (!disposed) setMessages(prev => prev.some(row => row.id === message.id) ? prev : [...prev, message])
        })
        if (disposed) { stop(); return }
        unsubscribe = stop
      } catch (error) {
        if (!disposed) setError(error instanceof Error ? error.message : 'Live updates are unavailable.')
      }
      try {
        const rows = await conversationService.getMessages(undefined, ticketId)
        if (!disposed) setMessages(prev => {
          const ids = new Set(rows.map(row => row.id))
          return [...rows, ...prev.filter(row => !ids.has(row.id))]
        })
      } catch (error) {
        if (!disposed) setError(error instanceof Error ? error.message : 'Unable to load conversation.')
      } finally {
        if (!disposed) setIsLoading(false)
      }
    }
    void load()
    return () => { disposed = true; unsubscribe?.() }
  }, [ticketId, currentUserId])

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
    const content = newMessage.trim()
    const optimisticId = `pending:${crypto.randomUUID()}`
    const optimistic: Message = {
      id: optimisticId, ticket_id: ticketId, content,
      author_id: currentUserId, author_type: isAgent ? 'agent' : 'customer',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimistic])
    let uploaded: Attachment[] = []
    try {
      uploaded = await conversationService.uploadAttachments(undefined, ticketId, attachments, isAgent && isInternalNote)
      // Use the isAgent prop to determine author_type
      const authorType = isAgent ? 'agent' : 'customer'

      const saved = await conversationService.addMessage(undefined, ticketId, content, authorType, uploaded, isAgent && isInternalNote)
      setMessages(prev => [...prev.filter(message => message.id !== optimisticId && message.id !== saved.id), saved])

      setNewMessage('')
      setAttachments([])
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      try { await conversationService.removeAttachments(undefined, uploaded) }
      catch (cleanupError) { console.error('Attachment cleanup failed:', cleanupError) }
      const message = attachments.length > 0 ? UPLOAD_FAILURE_MESSAGE : 'Message could not be sent. Please try again.'
      toast.error(message)
      setMessages(prev => prev.filter(message => message.id !== optimisticId))
      console.error('Error sending message:', err)
      setError(message)
      
      // Keep the draft and error available for retry.
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
    try {
      validateAttachments([...attachments, ...files])
      setAttachments(prev => [...prev, ...files])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to attach files.'
      setError(message)
      toast.error(message)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (!ticketId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a message to view the conversation
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }


  return (
    <div className="flex flex-col h-full">
      {/* Conversation Header - only show if not hidden */}
      {!hideHeader && (
        <div className={cn(
          "px-6 py-4",
          "border-b border-border",
          "bg-card"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                #{ticketId?.slice(0, 8)} • {formatTicketStatus(status)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 p-6 overflow-auto space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.author_id === currentUserId || 
            (isAgent && message.author_id === SYSTEM_USER_ID)
          
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isOwnMessage && "flex-row-reverse"
              )}
            >
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src={message.author?.avatar_url || "/images/default-avatar.png"}
                  alt={message.author?.name || (message.author_type === 'agent' ? 'Support agent' : 'Customer')}
                  fill
                  sizes="32px"
                  className="rounded-full object-cover"
                />
              </div>
              <div className={cn(
                "flex flex-col max-w-[70%]",
                isOwnMessage && "items-end"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.author_id === SYSTEM_USER_ID
                      ? 'System'
                      : isOwnMessage
                      ? 'You'
                      : message.author?.name || (message.author_type === 'agent' ? 'Support agent' : 'Customer')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(message.created_at)}
                  </span>
                </div>
                <div className={cn(
                  "p-3 rounded-lg",
                  isOwnMessage 
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.attachments?.map(attachment => (
                    <button
                      key={attachment.path}
                      type="button"
                      className="mt-2 block text-left text-sm underline break-all"
                      onClick={async () => {
                        try {
                          const url = await conversationService.getAttachmentUrl(undefined, attachment)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = attachment.name
                          link.target = '_blank'
                          link.rel = 'noopener noreferrer'
                          link.click()
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Unable to download attachment.')
                        }
                      }}
                    >
                      {attachment.name} ({Math.max(1, Math.ceil(attachment.size / 1024))} KB)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={cn(
        "p-4",
        "border-t border-border"
      )}>
        {error && (
          <div className="mb-2 text-sm text-destructive text-center">
            {error}
          </div>
        )}
        {isAgent && (
          <div className="flex items-center gap-2 mb-4">
            <Switch
              id="internal-note"
              checked={isInternalNote}
              onCheckedChange={(checked) => {
                if (onInternalNoteChange) {
                  onInternalNoteChange(checked)
                }
              }}
            />
            <Label 
              htmlFor="internal-note" 
              className="text-sm cursor-pointer select-none"
            >
              Internal Note
            </Label>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-lg",
                  "bg-muted text-muted-foreground"
                )}
              >
                <span className="text-sm">{file.name}</span>
                <button
                  disabled={isSending}
                  onClick={() => removeAttachment(index)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
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
            className={cn(
              "w-full p-3 pr-24 rounded-lg resize-none",
              "bg-background border border-input",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:bg-muted disabled:cursor-not-allowed"
            )}
            rows={3}
            disabled={isSending}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <input
              type="file"
              accept={ATTACHMENT_ACCEPT}
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <button
              onClick={handleFileSelect}
              disabled={isSending}
              className={cn(
                "p-2 rounded-full transition-colors",
                "text-primary hover:bg-muted"
              )}
              aria-label="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={() => void handleSendMessage()}
              disabled={!newMessage.trim() || isSending}
              className={cn(
                "p-2 rounded-full transition-colors",
                "text-primary hover:bg-muted",
                "disabled:opacity-50 disabled:hover:bg-transparent"
              )}
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 