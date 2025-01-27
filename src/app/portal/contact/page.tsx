'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MessageSquare, Loader2 } from 'lucide-react'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

type AIMessage = ChatCompletionMessageParam

export default function ContactSupportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)

  const handleAIResponse = async (userMessage: string) => {
    try {
      setIsTyping(true)
      
      // Add user message to chat
      const newMessages = [...messages, { role: 'user', content: userMessage } as AIMessage]
      setMessages(newMessages)
      
      // Get AI response
      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      // Add AI response to chat
      setMessages([...newMessages, { role: 'assistant', content: data.content } as AIMessage])

      // If there are relevant sources, show them
      if (data.sources?.length > 0) {
        toast.info('I found some helpful articles that might be relevant:', {
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => {
              window.open(data.sources[0].url, '_blank')
            }
          }
        })
      }
    } catch (error) {
      console.error('AI Support Error:', error)
      toast.error('Failed to get AI response. Please try again.')
    } finally {
      setIsTyping(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">AI Support Chat</h1>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Welcome to AI Support!</p>
            <p className="mt-1">Ask me anything about our services or get help with issues.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is typing...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                e.preventDefault()
                handleAIResponse(message)
                setMessage('')
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={() => {
              if (message.trim()) {
                handleAIResponse(message)
                setMessage('')
              }
            }}
            disabled={isTyping || !message.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
} 