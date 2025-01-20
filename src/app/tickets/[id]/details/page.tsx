'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { TicketDetails } from '@/components/features/tickets/TicketDetails'
import { ReplyComposer } from '@/components/features/tickets/ReplyComposer'
import type { Message, Ticket } from '@/types/ticket'

// Mock data - replace with actual API call
const mockTicket: Ticket = {
  id: '1',
  title: 'Unable to access dashboard after recent update',
  description: 'After the latest update, I am unable to access the dashboard. The page loads indefinitely and eventually times out. This is blocking our team from accessing critical metrics.',
  status: 'open',
  priority: 'high',
  type: 'problem',
  customer: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
  assignee: {
    id: '1',
    name: 'Support Agent',
    email: 'agent@example.com',
    role: 'agent',
  },
  messages: [
    {
      id: '1',
      content: 'Hi, I am experiencing issues accessing the dashboard after the recent update.',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      id: '2',
      content: 'Thank you for reporting this issue. Could you please provide your browser version and any error messages you are seeing?',
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      author: {
        id: '1',
        name: 'Support Agent',
        email: 'agent@example.com',
        role: 'agent',
      },
    },
  ],
  followers: [],
  metadata: {
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    tags: [
      { id: '1', name: 'bug', color: '#DE350B' },
      { id: '2', name: 'dashboard', color: '#00B8D9' },
    ],
    source: 'web',
  },
}

export default function TicketDetailsPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [ticket, setTicket] = useState<Ticket>(mockTicket)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReply = async (message: Omit<Message, 'id' | 'createdAt'>) => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Add message to ticket
      const newMessage = {
        ...message,
        id: String(ticket.messages.length + 1),
        createdAt: new Date().toISOString(),
      }

      setTicket(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        metadata: {
          ...prev.metadata,
          updatedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Ticket Details */}
      <TicketDetails ticket={ticket} />

      {/* Reply Composer */}
      <ReplyComposer onSubmit={handleReply} isSubmitting={isSubmitting} />
    </div>
  )
} 