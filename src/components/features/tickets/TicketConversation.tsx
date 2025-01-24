'use client'

import { useState } from 'react'
import { ConversationView } from '@/components/features/inbox/ConversationView'

interface TicketConversationProps {
  ticketId: string
  currentUserId: string
  className?: string
  isAgent?: boolean
}

export function TicketConversation({ 
  ticketId, 
  currentUserId, 
  className = '',
  isAgent = false 
}: TicketConversationProps) {
  const [isInternalNote, setIsInternalNote] = useState(false)

  const handleInternalNoteChange = (checked: boolean) => {
    setIsInternalNote(checked)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <ConversationView
        ticketId={ticketId}
        currentUserId={currentUserId}
        isInternalNote={isInternalNote}
        onInternalNoteChange={handleInternalNoteChange}
        isAgent={isAgent}
      />
    </div>
  )
} 