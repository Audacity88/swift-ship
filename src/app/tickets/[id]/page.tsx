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
import { StatusTransition } from '@/components/features/tickets/StatusTransition'
import { useSupabase } from '@/app/providers'
import { getTicket, updateTicket, updateTicketStatus } from '@/lib/services/ticket-service'
import type { Ticket as TicketData } from '@/lib/services/ticket-service'
import { TicketConversation } from '@/components/features/tickets/TicketConversation'

interface Tag {
  id: string
  name: string
  color: string
}

export default function TicketPage() {
  const params = useParams()
  const supabase = useSupabase()
  const ticketId = params?.id as string
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [selectedType, setSelectedType] = useState<TicketType>('problem')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [linkedProblem, setLinkedProblem] = useState<string | null>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Dropdown visibility states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [showFollowersDropdown, setShowFollowersDropdown] = useState(false)

  // Check auth status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Auth status:', { session: session?.user?.id, error })
        if (error) throw error
        setIsAuthenticated(!!session?.user)
        setCurrentUserId(session?.user?.id || null)
      } catch (error) {
        console.error('Auth error:', error)
        setError('Authentication failed')
        setIsAuthenticated(false)
      }
    }
    void checkAuth()
  }, [supabase])

  // Only fetch ticket data after authentication is confirmed
  useEffect(() => {
    const fetchTicket = async () => {
      if (!isAuthenticated || !ticketId) return
      
      try {
        const ticketData = await getTicket(ticketId)
        setTicket(ticketData)
        setSelectedType((ticketData.metadata?.type as TicketType) || 'problem')
        setSelectedPriority(ticketData.priority)
        setSelectedAssignee(ticketData.assignee?.id || null)
        setTags((ticketData.metadata?.tags as Tag[]) || [])
      } catch (error) {
        console.error('Error fetching ticket:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch ticket')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated === true) {
      void fetchTicket()
    }
  }, [ticketId, isAuthenticated])

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">Please log in to view this ticket</div>
    </div>
  }

  // Show loading state while fetching ticket
  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  }

  // Show error state
  if (error || !ticket) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-red-500">{error || 'Ticket not found'}</div>
    </div>
  }

  // Tag handlers
  const handleAddTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      const newTag: Tag = {
        id: `tag_${Date.now()}`,
        name: tagName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }

      const updatedTicket = await updateTicket(ticketId, {
        metadata: {
          ...ticket.metadata,
          tags: [...tags, newTag]
        }
      })
      
      setTags(prev => [...prev, newTag])
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagName: string) => {
    if (!ticket) return
    
    try {
      const updatedTicket = await updateTicket(ticketId, {
        metadata: {
          ...ticket.metadata,
          tags: tags.filter(t => t.name !== tagName)
        }
      })
      
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
        credentials: 'include',
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
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to remove follower')
      
      setFollowers(prev => prev.filter(f => f !== follower))
    } catch (error) {
      console.error('Failed to remove follower:', error)
    }
  }

  // Handle status change
  const handleStatusChange = async (newStatus: TicketStatus, reason?: string) => {
    if (!ticket) return
    
    try {
      const updatedTicket = await updateTicketStatus(ticketId, newStatus, reason)

      setTicket(prev => prev ? {
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString()
      } : null)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
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

          {/* Replace old comments section with TicketConversation */}
          <TicketConversation
            ticketId={ticket.id}
            currentUserId={currentUserId || ''}
            isAgent={true}
          />
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
                src="/images/default-avatar.png"
                alt="Profile"
                width={32}
                height={32}
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
                src="/images/default-avatar.png"
                alt="Profile"
                width={32}
                height={32}
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