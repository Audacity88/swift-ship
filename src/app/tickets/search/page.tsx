'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { TicketList } from '@/components/features/tickets/TicketList'
import { TicketStatus, TicketPriority } from '@/types/enums'
import type { TicketListItem } from '@/types/ticket'

// Mock data - replace with actual API calls
const mockTickets: TicketListItem[] = [
  {
    id: '1',
    title: 'Unable to access dashboard after recent update',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    customer: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    },
    assignee: {
      id: '1',
      name: 'Support Agent',
      email: 'agent@example.com',
      role: 'agent'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [
      { id: '1', name: 'bug', color: '#DE350B' },
      { id: '2', name: 'dashboard', color: '#00B8D9' },
    ],
  },
  // Add more mock tickets as needed
]

interface SearchFilters {
  status?: TicketStatus
  priority?: TicketPriority
  assignee?: string
  dateRange?: 'today' | 'week' | 'month' | 'custom'
  startDate?: string
  endDate?: string
}

export default function SearchTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [savedSearches] = useState([
    { id: '1', name: 'High Priority Bugs', query: 'bug priority:high' },
    { id: '2', name: 'My Open Tickets', query: 'assignee:me status:open' },
    { id: '3', name: 'Customer Feedback', query: 'tag:feedback' },
  ])

  // Filter tickets based on search query and filters
  const filteredTickets = mockTickets.filter((ticket) => {
    if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filters.status && ticket.status !== filters.status) return false
    if (filters.priority && ticket.priority !== filters.priority) return false
    // Add more filter conditions as needed
    return true
  })

  const clearFilters = () => {
    setFilters({})
    setShowFilters(false)
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by title, description, or ticket ID..."
              className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 rounded-lg \
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium \
              transition-colors ${
                showFilters
                  ? 'bg-gray-100 text-gray-900 border-gray-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    status: e.target.value as TicketStatus || undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Any status</option>
                  <option value={TicketStatus.OPEN}>Open</option>
                  <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TicketStatus.RESOLVED}>Resolved</option>
                  <option value={TicketStatus.CLOSED}>Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priority: e.target.value as TicketPriority || undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Any priority</option>
                  <option value={TicketPriority.URGENT}>Urgent</option>
                  <option value={TicketPriority.HIGH}>High</option>
                  <option value={TicketPriority.MEDIUM}>Medium</option>
                  <option value={TicketPriority.LOW}>Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Date Range</label>
                <select
                  value={filters.dateRange || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: e.target.value as SearchFilters['dateRange']
                  }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Assignee</label>
                <select
                  value={filters.assignee || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    assignee: e.target.value || undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Any assignee</option>
                  <option value="me">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved Searches */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Saved searches:</span>
        <div className="flex items-center gap-2">
          {savedSearches.map((search) => (
            <button
              key={search.id}
              onClick={() => setSearchQuery(search.query)}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full \
                hover:bg-gray-200 transition-colors"
            >
              {search.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Search Results
            <span className="ml-2 text-sm text-gray-500">
              {filteredTickets.length} tickets found
            </span>
          </h2>
        </div>
        <TicketList tickets={filteredTickets} />
      </div>
    </div>
  )
} 