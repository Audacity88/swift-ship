'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, SortAsc, SortDesc } from 'lucide-react'
import TicketList from '@/components/features/tickets/TicketList'
import { TicketStatus, TicketPriority } from '@/types/enums'
import { UserRole } from '@/types/role'
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

const statusOptions: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED
]

const priorityOptions: TicketPriority[] = [
  TicketPriority.URGENT,
  TicketPriority.HIGH,
  TicketPriority.MEDIUM,
  TicketPriority.LOW
]

export default function ActiveTicketsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus[]>([])
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter tickets based on selected filters
  const filteredTickets = mockTickets.filter((ticket) => {
    if (selectedStatus.length && !selectedStatus.includes(ticket.status)) return false
    if (selectedPriority.length && !selectedPriority.includes(ticket.priority)) return false
    return true
  })

  // Sort tickets by date
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Active Tickets</h1>
        <button
          onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 \
            transition-colors"
        >
          {sortOrder === 'asc' ? (
            <>
              <SortAsc className="w-4 h-4" />
              Oldest first
            </>
          ) : (
            <>
              <SortDesc className="w-4 h-4" />
              Newest first
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(prev => 
                    prev.includes(status)
                      ? prev.filter(s => s !== status)
                      : [...prev, status]
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedStatus.includes(status)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedStatus.includes(status) ? { backgroundColor: '#0052CC' } : {}}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block">Priority</label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => (
                <button
                  key={priority}
                  onClick={() => setSelectedPriority(prev => 
                    prev.includes(priority)
                      ? prev.filter(p => p !== priority)
                      : [...prev, priority]
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedPriority.includes(priority)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedPriority.includes(priority) ? { backgroundColor: '#0052CC' } : {}}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <TicketList tickets={sortedTickets} viewMode={viewMode} onTicketClick={handleTicketClick} />
    </div>
  )
} 