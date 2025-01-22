'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Search, Link2, AlertCircle, Check, X } from 'lucide-react'

interface LinkedTicket {
  id: string
  title: string
  status: string
  priority: string
  type: string
  createdAt: string
}

// Remove the mock data, define the LinkedTicket but we fetch from supabase
interface LinkedTicket {
  id: string
  title: string
  status: string
  priority: string
  type: string
  createdAt: string
}

export default function LinkedProblemPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LinkedTicket[]>([])
  const [linkedTickets, setLinkedTickets] = useState<LinkedTicket[]>([])

  useEffect(() => {
    // fetch existing linked "problem" tickets from supabase or from a /api/tickets?type=problem&linkedTo=...
    // For demonstration, we do a simpler approach
    const loadLinkedProblems = async () => {
      try {
        const response = await fetch(`/api/tickets?filters[type]=problem&filters[linkedTo]=${ticketId}`)
        // or store a "linked_tickets" table. We'll assume "metadata.linkedProblem" for demonstration
        if (response.ok) {
          const data = await response.json()
          setLinkedTickets(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load linked problems:', error)
      }
    }
    loadLinkedProblems()
  }, [ticketId])

  const handleSearch = async () => {
  setIsSearching(true)
  try {
    const response = await fetch(`/api/tickets?filters[type]=problem&search=${encodeURIComponent(searchQuery)}`)
    if (!response.ok) throw new Error('Failed to search tickets')
    const json = await response.json()
    setSearchResults(json.data || [])
  } catch (error) {
    console.error('Failed to search tickets:', error)
  } finally {
    setIsSearching(false)
  }
}

  const handleLink = async (ticket: LinkedTicket) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setLinkedTickets(prev => [...prev, ticket])
      setSearchResults(prev => prev.filter(t => t.id !== ticket.id))
    } catch (error) {
      console.error('Failed to link ticket:', error)
    }
  }

  const handleUnlink = async (ticketId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setLinkedTickets(prev => prev.filter(t => t.id !== ticketId))
    } catch (error) {
      console.error('Failed to unlink ticket:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Search and Link Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Link Related Problems</h2>
          
          {/* Search Input */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for tickets by ID or title"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg \
                  focus:outline-none focus:ring-2 focus:ring-primary/20 \
                  focus:border-primary transition-colors"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg \
                hover:bg-primary/90 transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0052CC' }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
              {searchResults.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border \
                    border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {ticket.id}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{ticket.type}</span>
                    </div>
                    <h4 className="text-sm text-gray-900">{ticket.title}</h4>
                  </div>
                  <button
                    onClick={() => handleLink(ticket)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium \
                      text-primary hover:bg-primary/5 rounded transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Tickets */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Linked Problems</h2>
          {linkedTickets.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No linked problems found</p>
              <p className="text-sm text-gray-500">
                Search and link related problems above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between p-4 border \
                    border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {ticket.id}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span
                        className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                          ticket.priority === 'urgent'
                            ? 'bg-red-50 text-red-700'
                            : ticket.priority === 'high'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <h4 className="text-sm text-gray-900">{ticket.title}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          ticket.status === 'open'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Created on {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(ticket.id)}
                    className="flex items-center gap-1 px-2 py-1 text-sm font-medium \
                      text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relationship Details */}
      <div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Relationship Details</h2>
          
          {/* Statistics */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {linkedTickets.length}
                  </div>
                  <div className="text-sm text-gray-500">Linked Problems</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {linkedTickets.filter(t => t.status === 'open').length}
                  </div>
                  <div className="text-sm text-gray-500">Open Problems</div>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Linking Guidelines
              </h3>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Link related problems to track dependencies</li>
                <li>• Ensure proper problem categorization</li>
                <li>• Review existing links periodically</li>
                <li>• Update relationships as problems evolve</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 