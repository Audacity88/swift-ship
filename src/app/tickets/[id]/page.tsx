'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { 
  FileText, AlertCircle, HelpCircle, Wrench, Check, Clock,
  Tag, Link as LinkIcon, Users, ChevronDown, MessageSquare
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { TicketStatus, TicketPriority, UserRole } from '@/types/enums'
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

// Mock data - replace with actual API call
const mockTicket: Ticket = {
  id: '1',
  title: 'Unable to access dashboard after recent update',
  subject: 'Unable to access dashboard after recent update',
  description: 'After the latest update, I am unable to access the dashboard. The page loads indefinitely and eventually times out. This is blocking our team from accessing critical metrics.',
  status: TicketStatus.OPEN,
  priority: TicketPriority.HIGH,
  isArchived: false,
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [
      { id: '1', name: 'bug', color: '#DE350B' },
      { id: '2', name: 'dashboard', color: '#00B8D9' },
    ],
    customFields: {},
    company: 'Acme Corp'
  },
  customerId: '1',
  assigneeId: '1',
  customer: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  assignee: {
    id: '1',
    name: 'Support Agent',
    email: 'agent@example.com',
    role: UserRole.AGENT,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  comments: [
    {
      id: '1',
      ticketId: '1',
      content: 'Hi, I am experiencing issues accessing the dashboard after the recent update.',
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isInternal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      ticketId: '1',
      content: 'Thank you for reporting this issue. Could you please provide your browser version and any error messages you are seeing?',
      user: {
        id: '1',
        name: 'Support Agent',
        email: 'agent@example.com',
        role: UserRole.AGENT,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isInternal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

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
  const [ticket, setTicket] = useState<Ticket>(mockTicket)
  const [selectedType, setSelectedType] = useState<TicketType>('problem')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(ticket.priority)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(ticket.assigneeId || null)
  const [tags, setTags] = useState<Tag[]>(ticket.metadata?.tags || [])
  const [linkedProblem, setLinkedProblem] = useState<string | null>(null)
  const [followers, setFollowers] = useState(['Dan G'])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown visibility states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [showFollowersDropdown, setShowFollowersDropdown] = useState(false)

  // Tag handlers
  const handleAddTag = (tagName: string) => {
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: tagName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16) // Generate random color
    }
    setTags(prev => [...prev, newTag])
  }

  const handleRemoveTag = (tagName: string) => {
    setTags(prev => prev.filter(t => t.name !== tagName))
  }

  // Follower handlers
  const handleAddFollower = (follower: string) => {
    setFollowers(prev => [...prev, follower])
  }

  const handleRemoveFollower = (follower: string) => {
    setFollowers(prev => prev.filter(f => f !== follower))
  }

  // Reply handler
  const handleReply = async (message: ReplyMessage) => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Add comment to ticket
      const newComment: TicketComment = {
        id: String(ticket.comments.length + 1),
        ticketId: ticket.id,
        content: message.content,
        user: message.user,
        isInternal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setTicket(prev => ({
        ...prev,
        comments: [...prev.comments, newComment],
        updatedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
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
                {ticket.subject}
              </h1>
              <div className="mt-1 text-sm text-gray-500">
                Created {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusTransition
                ticketId={ticket.id}
                currentStatus={ticket.status}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-6 mb-6">
            {ticket.comments.map((comment) => (
              <div key={comment.id} className="bg-blue-50 rounded-lg p-4">
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
            <ChevronDown className="w-4 h-4 text-gray-400" />
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