'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Link as LinkIcon, Plus, X } from 'lucide-react'

interface LinkedTicket {
  id: string
  title: string
  status: string
  priority: string
  created_at: string
}

export default function LinkedProblemPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [linkedTickets, setLinkedTickets] = useState<LinkedTicket[]>([])
  const [availableTickets, setAvailableTickets] = useState<LinkedTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string

  // Load current linked problem tickets
  useEffect(() => {
    const loadLinkedProblems = async () => {
      try {
        const response = await fetch('/api/tickets/' + ticketId + '/linked-problems', {
          credentials: 'include'
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch linked problems')
        }
        const data = await response.json()
        setLinkedTickets(data || [])
      } catch (error) {
        console.error('Failed to load linked problems:', error)
      }
    }
    loadLinkedProblems()
  }, [ticketId])

  // Load available problem tickets
  useEffect(() => {
    const loadAvailableProblems = async () => {
      try {
        const response = await fetch('/api/tickets?type=problem', {
          credentials: 'include'
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch available problems')
        }
        const data = await response.json()
        setAvailableTickets(data.filter((ticket: LinkedTicket) => 
          ticket.id !== ticketId && !linkedTickets.some(lt => lt.id === ticket.id)
        ))
      } catch (error) {
        console.error('Failed to load available problems:', error)
      }
    }
    loadAvailableProblems()
  }, [ticketId, linkedTickets])

  // Filter tickets based on search query
  const filteredTickets = availableTickets.filter((ticket) => {
    if (!searchQuery) return true
    return ticket.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleLinkToggle = async (ticket: LinkedTicket) => {
    setIsLoading(true)
    try {
      const isLinked = linkedTickets.some(t => t.id === ticket.id)
      const method = isLinked ? 'DELETE' : 'POST'
      
      const response = await fetch('/api/tickets/' + ticketId + '/linked-problems', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: ticket.id }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update linked problems')
      }

      if (isLinked) {
        setLinkedTickets(prev => prev.filter(t => t.id !== ticket.id))
      } else {
        setLinkedTickets(prev => [...prev, ticket])
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to update linked problems:', error)
      // TODO: Add toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Linked Problem Tickets</h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problem tickets..."
            className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 rounded-lg \
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Linked Tickets */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Linked Problems</h3>
          <div className="space-y-2">
            {linkedTickets.length === 0 ? (
              <p className="text-sm text-gray-500">No problem tickets linked</p>
            ) : (
              linkedTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => !isLoading && handleLinkToggle(ticket)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm \
                    bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{ticket.title}</span>
                  </div>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Available Tickets */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Problem Tickets</h3>
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => !isLoading && handleLinkToggle(ticket)}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-2 text-sm \
                  border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span>{ticket.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-gray-100">{ticket.status}</span>
                  <span className="px-2 py-1 rounded-full bg-gray-100">{ticket.priority}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 