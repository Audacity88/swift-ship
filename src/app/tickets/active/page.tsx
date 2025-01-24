'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, SortAsc, SortDesc } from 'lucide-react'
import TicketList from '@/components/features/tickets/TicketList'
import { TicketStatus, TicketPriority } from '@/types/enums'
import { RoleType } from '@/types/role'
import { useAuth } from '@/lib/hooks/useAuth'
import type { TicketListItem } from '@/types/ticket'
import { useQuery } from '@tanstack/react-query'
import { getServerSupabase } from '@/lib/supabase-client'

export default function ActiveTicketsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus[]>([])
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: response = { data: [] }, isLoading } = useQuery<{ data: TicketListItem[] }>({
    queryKey: ['active-tickets', selectedStatus, selectedPriority, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      // Add filters if selected
      if (selectedStatus.length > 0) {
        selectedStatus.forEach(status => {
          params.append('status', status);
        });
      }
      if (selectedPriority.length > 0) {
        selectedPriority.forEach(priority => {
          params.append('priority', priority.toLowerCase());
        });
      }
      // Add sorting
      params.set('sortField', 'created_at')
      params.set('sortDirection', sortOrder)
      // Set default type
      params.set('type', 'ticket')

      console.log('Fetching tickets with params:', params.toString())
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }
      const data = await response.json()
      console.log('Received tickets:', data)
      return data
    }
  })

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {user?.role === RoleType.ADMIN ? 'Open Tickets' : 'My Tickets'}
        </h1>
        <button
          onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
              {Object.values(TicketStatus)
                .map((status) => (
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
              {Object.values(TicketPriority).map((priority) => (
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
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="text-center py-8">Loading tickets...</div>
      ) : (
        <TicketList 
          tickets={response.data} 
          viewMode={viewMode} 
          onTicketClick={handleTicketClick} 
        />
      )}
    </div>
  )
}