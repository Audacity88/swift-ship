'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { 
  AlertCircle, HelpCircle, Wrench, Check, Search,
  Tag as TagIcon, X, Users, ChevronDown
} from 'lucide-react'
import type { TicketType } from '@/types/ticket'

interface DropdownProps {
  show: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Dropdown({ show, onClose, children, className = '' }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div 
      ref={ref}
      className={`absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 ${className}`}
    >
      {children}
    </div>
  )
}

// Type Dropdown
interface TypeDropdownProps {
  show: boolean
  onClose: () => void
  selectedType: TicketType
  onSelect: (type: TicketType) => void
}

const typeOptions = [
  {
    type: 'problem',
    label: 'Problem',
    description: 'Something is not working as expected',
    icon: AlertCircle,
    color: '#DE350B',
  },
  {
    type: 'question',
    label: 'Question',
    description: 'Further information is requested',
    icon: HelpCircle,
    color: '#00B8D9',
  },
  {
    type: 'task',
    label: 'Task',
    description: 'A task that needs to be completed',
    icon: Wrench,
    color: '#36B37E',
  },
  {
    type: 'incident',
    label: 'Incident',
    description: 'A service interruption or degradation',
    icon: AlertCircle,
    color: '#FF991F',
  },
]

export function TypeDropdown({ show, onClose, selectedType, onSelect }: TypeDropdownProps) {
  return (
    <Dropdown show={show} onClose={onClose} className="w-80">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">Change ticket type</h3>
      </div>
      <div className="p-2">
        {typeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selectedType === option.type
          return (
            <button
              key={option.type}
              onClick={() => {
                onSelect(option.type)
                onClose()
              }}
              className="flex items-start gap-3 w-full p-2 rounded hover:bg-gray-50"
            >
              <div
                className="p-1.5 rounded"
                style={{ backgroundColor: `${option.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: option.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              {isSelected && (
                <Check className="w-4 h-4" style={{ color: option.color }} />
              )}
            </button>
          )
        })}
      </div>
    </Dropdown>
  )
}

// Priority Dropdown
interface PriorityDropdownProps {
  show: boolean
  onClose: () => void
  selectedPriority: string
  onSelect: (priority: string) => void
}

const priorityOptions = [
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Needs immediate attention',
    color: '#DE350B',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Important issue, needs quick response',
    color: '#FF991F',
  },
  {
    value: 'normal',
    label: 'Normal',
    description: 'Default priority level',
    color: '#00B8D9',
  },
  {
    value: 'low',
    label: 'Low',
    description: 'Minor issue or question',
    color: '#36B37E',
  },
]

export function PriorityDropdown({ show, onClose, selectedPriority, onSelect }: PriorityDropdownProps) {
  return (
    <Dropdown show={show} onClose={onClose} className="w-80">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">Set priority level</h3>
      </div>
      <div className="p-2">
        {priorityOptions.map((option) => {
          const isSelected = selectedPriority === option.value
          return (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value)
                onClose()
              }}
              className="flex items-start gap-3 w-full p-2 rounded hover:bg-gray-50"
            >
              <div
                className="w-4 h-4 mt-0.5 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              {isSelected && (
                <Check className="w-4 h-4" style={{ color: option.color }} />
              )}
            </button>
          )
        })}
      </div>
    </Dropdown>
  )
}

// Tags Dropdown
interface TagsDropdownProps {
  show: boolean
  onClose: () => void
  selectedTags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

export function TagsDropdown({ show, onClose, selectedTags, onAdd, onRemove }: TagsDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const suggestedTags = [
    'bug', 'feature', 'documentation', 'support',
    'enhancement', 'question', 'help wanted', 'wontfix',
  ].filter(tag => !selectedTags.includes(tag))

  const filteredTags = suggestedTags.filter(tag => 
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dropdown show={show} onClose={onClose} className="w-80">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">Manage tags</h3>
      </div>
      <div className="p-4">
        {/* Selected Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
            >
              {tag}
              <button
                onClick={() => onRemove(tag)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg \
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Suggested Tags */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Suggested Tags</h4>
          <div className="flex flex-wrap gap-2">
            {filteredTags.map(tag => (
              <button
                key={tag}
                onClick={() => onAdd(tag)}
                className="px-2 py-1 text-sm text-gray-700 bg-gray-100 \
                  rounded hover:bg-gray-200 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dropdown>
  )
}

// Followers Dropdown
interface FollowersDropdownProps {
  show: boolean
  onClose: () => void
  followers: string[]
  onAdd: (follower: string) => void
  onRemove: (follower: string) => void
}

export function FollowersDropdown({ show, onClose, followers, onAdd, onRemove }: FollowersDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const suggestedFollowers = [
    { id: '1', name: 'Dan G', email: 'dan@example.com' },
    { id: '2', name: 'Sarah Wilson', email: 'sarah@example.com' },
    { id: '3', name: 'Michael Chen', email: 'michael@example.com' },
  ].filter(user => !followers.includes(user.name))

  const filteredFollowers = suggestedFollowers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dropdown show={show} onClose={onClose} className="w-80">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">Manage followers</h3>
      </div>
      <div className="p-4">
        {/* Current Followers */}
        <div className="space-y-2 mb-4">
          {followers.map(follower => (
            <div
              key={follower}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm font-medium">{follower}</span>
              <button
                onClick={() => onRemove(follower)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg \
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Suggested Users */}
        <div className="space-y-2">
          {filteredFollowers.map(user => (
            <button
              key={user.id}
              onClick={() => onAdd(user.name)}
              className="flex items-center gap-3 w-full p-2 rounded hover:bg-gray-50"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src="/default-avatar.png"
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Dropdown>
  )
} 