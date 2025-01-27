'use client'

import { ChatInterface } from '@/components/features/ai-support/ChatInterface'
import { MessageSquare } from 'lucide-react'

export default function ContactSupportPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">AI Support Chat</h1>
        </div>
      </div>

      <div className="flex-1 p-6">
        <ChatInterface />
      </div>
    </div>
  )
} 