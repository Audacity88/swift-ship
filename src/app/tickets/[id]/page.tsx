'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { 
  FileText, AlertCircle, HelpCircle, Wrench, Check, Clock,
  Tag, Link as LinkIcon, Users, ChevronDown, MessageSquare
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { TicketStatus, TicketPriority } from '@/types/ticket'
import type { Ticket, TicketComment, TicketType } from '@/types/ticket'
import type { User } from '@/types/user'
import { 
  TypeDropdown, 
  PriorityDropdown, 
  TagsDropdown, 
  FollowersDropdown 
} from '@/components/features/tickets/PropertyDropdowns'
import { ReplyComposer } from '@/components/features/tickets/ReplyComposer'
import { StatusTransition } from '@/components/features/tickets/StatusTransition'

interface Tag {
  id: string
  name: string
  color: string
}

interface ReplyMessage {
  content: string;
  user: User;
}

export default function TicketPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [selectedType, setSelectedType] = useState<TicketType>('problem')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [linkedProblem, setLinkedProblem] = useState<string | null>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dropdown visibility states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [showFollowersDropdown, setShowFollowersDropdown] = useState(false)

  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch ticket')
        }
        const data = await response.json()
        setTicket(data.data)
        setSelectedType(data.data.type || 'problem')
        setSelectedPriority(data.data.priority)
        setSelectedAssignee(data.data.assigneeId)
        setTags(data.data.metadata?.tags || [])
      } catch (error) {
        console.error('Error fetching ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch ticket')
      } finally {
        setIsLoading(false)
      }
    }

    if (ticketId) {
      fetchTicket()
    }
  }, [ticketId])

  // Tag handlers
  const handleAddTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: [...tags.map(t => t.id), tagName]
        })
      })
      
      if (!response.ok) throw new Error('Failed to add tag')
      
      const newTag: Tag = {
        id: `tag_${Date.now()}`,
        name: tagName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }
      setTags(prev => [...prev, newTag])
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tags.filter(t => t.name !== tagName).map(t => t.id)
        })
      })
      
      if (!response.ok) throw new Error('Failed to remove tag')
      
      setTags(prev => prev.filter(t => t.name !== tagName))
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  // Follower handlers
  const handleAddFollower = async (follower: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/followers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower })
      })
      
      if (!response.ok) throw new Error('Failed to add follower')
      
      setFollowers(prev => [...prev, follower])
    } catch (error) {
      console.error('Failed to add follower:', error)
    }
  }

  const handleRemoveFollower = async (follower: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/followers/${encodeURIComponent(follower)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to remove follower')
      
      setFollowers(prev => prev.filter(f => f !== follower))
    } catch (error) {
      console.error('Failed to remove follower:', error)
    }
  }

  // Reply handler
  const handleReply = async (message: ReplyMessage) => {
    if (!ticket) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.content,
          isInternal: false
        })
      })

      if (!response.ok) throw new Error('Failed to add comment')

      const data = await response.json()
      setTicket(prev => prev ? {
        ...prev,
        comments: [...prev.comments, data.data],
        updatedAt: new Date().toISOString()
      } : null)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle status change
  const handleStatusChange = async (newStatus: TicketStatus, reason?: string) => {
    if (!ticket) return
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason
        })
      })

      if (!response.ok) throw new Error('Failed to update status')

      setTicket(prev => prev ? {
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString()
      } : null)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  if (error || !ticket) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">{error || 'Ticket not found'}</div>
    </div>
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Ticket Content */}
      <div className="flex-1 overflow-auto border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {ticket.title}
              </h1>
              <div className="mt-1 text-sm text-gray-500">
                Created {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusTransition
                ticketId={ticket.id}
                currentStatus={ticket.status}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-6 mb-6">
            {ticket.comments.map((comment) => (
              <div 
                key={comment.id} 
                className={`rounded-lg p-4 ${
                  comment.isInternal ? 'bg-yellow-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src="/default-avatar.png"
                      alt={comment.user.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{comment.user.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {comment.isInternal && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      Internal Note
                    </span>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>

          {/* Reply Composer */}
          <ReplyComposer onSubmit={handleReply} isSubmitting={isSubmitting} />
        </div>
      </div>

      {/* Ticket Properties Sidebar */}
      <div className="w-80 overflow-auto bg-gray-50 p-6 space-y-6">
        {/* Requester */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Requester</h3>
          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
            <div className="relative w-8 h-8 rounded-full overflow-hidden">
              <Image
                src="/default-avatar.png"
                alt={ticket.customer.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{ticket.customer.name}</p>
              <p className="text-xs text-gray-500">{ticket.customer.email}</p>
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Assignee</h3>
          <button className="flex items-center gap-3 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
            <div className="relative w-8 h-8 rounded-full overflow-hidden">
              <Image
                src="/default-avatar.png"
                alt={ticket.assignee?.name || 'Unassigned'}
                fill
                className="object-cover"
              />
            </div>
            <span className="flex-1 text-left text-sm">
              {ticket.assignee?.name || 'Unassigned'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Type */}
        <div className="relative">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Type</h3>
          <button
            onClick={() => setShowTypeDropdown(true)}
            className="flex items-center gap-3 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <AlertCircle className="w-5 h-5 text-[#DE350B]" />
            <span className="flex-1 text-left text-sm">{selectedType}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <TypeDropdown
            show={showTypeDropdown}
            onClose={() => setShowTypeDropdown(false)}
            selectedType={selectedType}
            onSelect={setSelectedType}
          />
        </div>

        {/* Priority */}
        <div className="relative">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
          <button
            onClick={() => setShowPriorityDropdown(true)}
            className="flex items-center gap-3 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="flex-1 text-left text-sm">{selectedPriority}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <PriorityDropdown
            show={showPriorityDropdown}
            onClose={() => setShowPriorityDropdown(false)}
            selectedPriority={selectedPriority}
            onSelect={(priority) => setSelectedPriority(priority as TicketPriority)}
          />
        </div>

        {/* Tags */}
        <div className="relative">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
          <button
            onClick={() => setShowTagsDropdown(true)}
            className="flex items-center gap-2 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <Tag className="w-4 h-4 text-gray-400" />
            <div className="flex-1 flex items-center gap-2">
              {tags.map(tag => (
                <span 
                  key={tag.id} 
                  className="px-2 py-1 text-xs rounded"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    color: tag.color
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <TagsDropdown
            show={showTagsDropdown}
            onClose={() => setShowTagsDropdown(false)}
            selectedTags={tags.map(t => t.name)}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
          />
        </div>

        {/* Linked Problem */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Linked Problem</h3>
          <button className="flex items-center gap-2 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
            <LinkIcon className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left text-sm text-gray-500">None</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Followers */}
        <div className="relative">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Followers</h3>
          <button
            onClick={() => setShowFollowersDropdown(true)}
            className="flex items-center gap-2 w-full p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left text-sm">
              {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <FollowersDropdown
            show={showFollowersDropdown}
            onClose={() => setShowFollowersDropdown(false)}
            followers={followers}
            onAdd={handleAddFollower}
            onRemove={handleRemoveFollower}
          />
        </div>
      </div>
    </div>
  )
} 