'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock, Filter, ChevronDown, MessageSquare, Tag, AlertCircle, User } from 'lucide-react'
import Image from 'next/image'

interface HistoryEvent {
  id: string
  type: 'status' | 'priority' | 'assignee' | 'comment' | 'tag' | 'type'
  action: string
  user: {
    name: string
    email: string
    avatar: string
  }
  timestamp: string
  details: {
    from?: string
    to?: string
    comment?: string
    tags?: string[]
  }
}

const filterOptions = [
  { value: 'all', label: 'All Activities' },
  { value: 'status', label: 'Status Changes' },
  { value: 'priority', label: 'Priority Updates' },
  { value: 'assignee', label: 'Assignee Changes' },
  { value: 'comment', label: 'Comments' },
  { value: 'tag', label: 'Tag Updates' },
  { value: 'type', label: 'Type Changes' },
]

export default function TicketHistoryPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/audit-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: { entity_id: ticketId, entity_type: ['ticket'] },
            sort: { field: 'created_at', direction: 'desc' },
            pagination: { page: 1, per_page: 50 }
          })
        })
        const json = await response.json()
        const logs = json.data || []
        const mapped = logs.map((log:any) => ({
          id: log.id,
          type: 'comment',
          action: log.action,
          user: {
            name: log.actor?.name || 'System',
            email: log.actor?.email || '',
            avatar: '',
          },
          timestamp: log.created_at,
          details: log.changes || {}
        })) as HistoryEvent[]
        setHistoryEvents(mapped)
      } catch (error) {
        console.error('Error loading audit logs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAuditLogs()
  }, [ticketId])

  const filteredHistory = selectedFilter === 'all'
    ? historyEvents
    : historyEvents.filter(event => event.type === selectedFilter)

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'priority':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'assignee':
        return <User className="w-5 h-5 text-purple-500" />
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-green-500" />
      case 'tag':
        return <Tag className="w-5 h-5 text-pink-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Activity Timeline */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Activity Timeline</h2>
            
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {filterOptions.find(opt => opt.value === selectedFilter)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedFilter(option.value)
                        setIsFilterOpen(false)
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        selectedFilter === option.value
                          ? 'bg-primary/5 text-primary'
                          : 'text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading history...</div>
            ) : (
              filteredHistory.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="relative flex flex-col items-center">
                    <div className="p-2 rounded-full bg-gray-50">
                      {getEventIcon(event.type)}
                    </div>
                    {index !== filteredHistory.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <Image
                              src={event.user.avatar || '/images/default-avatar.png'}
                              alt={event.user.name}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <span className="font-medium text-gray-900">
                              {event.user.name}
                            </span>
                          </div>
                          <span className="text-gray-500">{event.action}</span>
                        </div>

                        {/* Event Details */}
                        {event.type === 'comment' ? (
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-2">
                            {event.details.comment}
                          </p>
                        ) : event.type === 'tag' ? (
                          <div className="flex items-center gap-2 mt-1">
                            {event.details.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500">{event.details.from}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-gray-900">{event.details.to}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h2>
          
          {/* Statistics */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900">
                  {historyEvents.length}
                </div>
                <div className="text-sm text-gray-500">Total Activities</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900">
                  {historyEvents.filter(e => e.type === 'comment').length}
                </div>
                <div className="text-sm text-gray-500">Comments</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 