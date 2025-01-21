'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import {
  User as UserIcon,
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
  MoreHorizontal,
  Plus,
  Send
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Editor } from '@/components/ui/editor'
import { SLAIndicator } from '@/components/features/tickets/SLAIndicator'
import { TagSelect } from '@/components/features/tags/TagSelect'
import { CustomFieldsSection } from '@/components/features/custom-fields/CustomFieldsSection'
import { StatusTransition } from '@/components/features/tickets/StatusTransition'
import { AuditLogViewer } from '@/components/features/audit/AuditLogViewer'
import type { Ticket, Tag, TicketComment, Customer, Agent } from '@/types/ticket'
import type { User } from '@/types/user'
import { TicketStatus, TicketPriority } from '@/types/enums'
import type { CustomFieldValueWithId } from '@/types/custom-field'
import { cn } from '@/lib/utils'

interface TicketDetailsProps {
  ticketId: string
  className?: string
  onClose?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
}

interface TicketListItem {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: Customer;
  assignee?: Agent;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
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
  const [newComment, setNewComment] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Load ticket data
  useEffect(() => {
    const loadTicket = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
          credentials: 'include'
        })
        console.log('Ticket response status:', response.status)
        if (!response.ok) {
          const error = await response.json()
          console.error('Failed to load ticket:', error)
          throw new Error(error.error || 'Failed to load ticket')
        }
        const { data } = await response.json()
        console.log('Ticket data:', data)
        setTicket(data)
      } catch (error) {
        console.error('Failed to load ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to load ticket')
      } finally {
        setIsLoading(false)
      }
    }

    loadTicket()
  }, [ticketId])

  // Scroll to bottom of comments when new ones are added
  useEffect(() => {
    if (activeTab === 'details') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticket?.comments?.length, activeTab])

  const handleTagsChange = async (tagIds: string[]) => {
    if (!ticket) return

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds })
      })

      if (!response.ok) throw new Error('Failed to update tags')

      const updatedTicket = await response.json()
      setTicket(updatedTicket)
    } catch (error) {
      console.error('Failed to update tags:', error)
      // TODO: Show error toast
    }
  }

  const handleStatusChange = async (newStatus: TicketStatus, reason?: string) => {
    if (!ticket) return

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      })

      if (!response.ok) throw new Error('Failed to update status')

      const updatedTicket = await response.json()
      setTicket(updatedTicket)
    } catch (error) {
      console.error('Failed to update status:', error)
      // TODO: Show error toast
    }
  }

  const handleSubmitComment = async () => {
    if (!ticket || !newComment.trim()) return

    try {
      setIsSubmittingComment(true)
      const response = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          isInternal: isInternalNote
        })
      })

      if (!response.ok) throw new Error('Failed to add comment')

      const updatedTicket = await response.json()
      setTicket(updatedTicket)
      setNewComment('')
      setIsInternalNote(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
      // TODO: Show error toast
    } finally {
      setIsSubmittingComment(false)
    }
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

  const isArchived = ticket.metadata?.archivedAt != null
  const createdAt = ticket.metadata?.createdAt || ticket.createdAt
  const updatedAt = ticket.metadata?.updatedAt || ticket.updatedAt
  const tags = ticket.metadata?.tags || []
  const customFields = ticket.metadata?.customFields || []

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{ticket.title}</h2>
            <Badge variant="outline">#{ticket.id}</Badge>
            {isArchived && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Created {format(new Date(createdAt), 'MMM d, yyyy HH:mm')}
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
              {isArchived ? (
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
                  onStatusChange={handleStatusChange}
                />
                <SLAIndicator 
                  ticket={{
                    id: ticket.id,
                    title: ticket.title,
                    status: ticket.status,
                    priority: ticket.priority,
                    customer: {
                      id: ticket.customer.id,
                      name: ticket.customer.name,
                      email: ticket.customer.email,
                      avatar: ticket.customer.avatar,
                      company: ticket.metadata?.company
                    },
                    assignee: ticket.assignee ? {
                      id: ticket.assignee.id,
                      name: ticket.assignee.name,
                      email: ticket.assignee.email,
                      avatar: ticket.assignee.avatar,
                      role: ticket.assignee.role.toLowerCase() as 'agent' | 'admin'
                    } : undefined,
                    createdAt,
                    updatedAt,
                    tags
                  }} 
                />
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Customer</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span>{ticket.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{ticket.customer.email}</span>
                  </div>
                  {ticket.metadata?.company && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span>{ticket.metadata.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="font-medium">Tags</h3>
                <TagSelect
                  value={tags.map(tag => tag.id)}
                  onChange={handleTagsChange}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="font-medium">Description</h3>
                <div className="p-4 rounded-lg bg-gray-50">
                  {ticket.description}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <h3 className="font-medium">Comments</h3>
                <div className="space-y-4">
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={cn(
                        "p-4 rounded-lg",
                        comment.isInternal ? "bg-yellow-50" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {comment.user.avatar ? (
                            <img
                              src={comment.user.avatar}
                              alt={comment.user.name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <UserIcon className="w-6 h-6" />
                          )}
                          <span className="font-medium">{comment.user.name}</span>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Internal Note
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>

                {/* New Comment */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-note"
                      checked={isInternalNote}
                      onCheckedChange={setIsInternalNote}
                    />
                    <Label htmlFor="internal-note">Internal Note</Label>
                  </div>
                  <div className="flex gap-2">
                    <Editor
                      value={newComment}
                      onChange={setNewComment}
                      placeholder={isInternalNote ? "Add an internal note..." : "Add a comment..."}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={isSubmittingComment || !newComment.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <AuditLogViewer ticketId={ticket.id} />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
} 