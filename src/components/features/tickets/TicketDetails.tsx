'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  User,
  Mail,
  Phone,
  Building,
  Clock,
  MessageSquare,
  Paperclip,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Archive,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SLAIndicator } from '@/components/features/tickets/SLAIndicator'
import { TagList } from '@/components/features/tags/TagList'
import { CustomFieldsSection } from '@/components/features/custom-fields/CustomFieldsSection'
import { StatusTransition } from '@/components/features/tickets/StatusTransition'
import { AuditLogViewer } from '@/components/features/audit/AuditLogViewer'
import type { Ticket, Tag } from '@/types/ticket'
import type { CustomFieldValueWithId } from '@/types/custom-field'

interface TicketDetailsProps {
  ticketId: string
  className?: string
  onClose?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
}

export function TicketDetails({
  ticketId,
  className = '',
  onClose,
  onEdit,
  onArchive,
  onUnarchive
}: TicketDetailsProps) {
  // State
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')

  // Load ticket data
  useEffect(() => {
    const loadTicket = async () => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual API call
        const response = await fetch(`/api/tickets/${ticketId}`).then(res => res.json())
        setTicket(response.data)
      } catch (error) {
        console.error('Failed to load ticket:', error)
        // TODO: Show error toast
      } finally {
        setIsLoading(false)
      }
    }

    loadTicket()
  }, [ticketId])

  // Handle tag click
  const handleTagClick = (tag: Tag) => {
    // TODO: Implement tag filtering/navigation
    console.log('Tag clicked:', tag)
  }

  if (isLoading || !ticket) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="animate-spin">
          {/* TODO: Add loading spinner */}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{ticket.title}</h2>
            <Badge variant="outline">#{ticket.number}</Badge>
            {ticket.isArchived && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Created {format(new Date(ticket.metadata.createdAt), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ticket.isArchived ? (
                <DropdownMenuItem onClick={onUnarchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'details' ? 'default' : 'ghost'}
            className="rounded-none"
            onClick={() => setActiveTab('details')}
          >
            Details
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            className="rounded-none"
            onClick={() => setActiveTab('history')}
          >
            History
          </Button>
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1">
          {activeTab === 'details' ? (
            <div className="p-4 space-y-6">
              {/* Status & Priority */}
              <div className="flex items-center justify-between">
                <StatusTransition
                  ticketId={ticket.id}
                  currentStatus={ticket.status}
                />
                <SLAIndicator 
                  ticket={{
                    ...ticket,
                    createdAt: ticket.metadata.createdAt,
                    updatedAt: ticket.metadata.updatedAt,
                    tags: ticket.metadata.tags
                  }} 
                />
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Customer</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{ticket.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{ticket.customer.email}</span>
                  </div>
                  {ticket.customer.company && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span>{ticket.customer.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="font-medium">Tags</h3>
                <TagList
                  tags={ticket.metadata.tags}
                  onTagClick={handleTagClick}
                  limit={10}
                />
              </div>

              {/* Custom Fields */}
              <CustomFieldsSection
                ticketId={ticket.id}
                fields={ticket.metadata.customFields.map((value, index) => ({
                  field_id: `field_${index}`,
                  value
                }))}
              />

              {/* Messages */}
              <div className="space-y-2">
                <h3 className="font-medium">Messages</h3>
                <div className="space-y-4">
                  {ticket.messages.map(message => (
                    <div
                      key={message.id}
                      className="p-3 bg-gray-50 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {message.author.avatar && (
                            <img
                              src={message.author.avatar}
                              alt={message.author.name}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="font-medium">
                            {message.author.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(message.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Paperclip className="w-4 h-4" />
                          <span>{message.attachments.length} attachments</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <AuditLogViewer
                entityType="ticket"
                entityId={ticket.id}
              />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
} 