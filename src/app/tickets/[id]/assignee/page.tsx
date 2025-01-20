'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, UserPlus, History, Check } from 'lucide-react'
import type { Agent } from '@/types/ticket'

// Mock data - replace with actual API calls
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    role: 'agent',
    avatar: 'https://picsum.photos/200',
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@example.com',
    role: 'agent',
    avatar: 'https://picsum.photos/201',
  },
  {
    id: '3',
    name: 'Emma Davis',
    email: 'emma@example.com',
    role: 'agent',
    avatar: 'https://picsum.photos/202',
  },
]

const mockAssignmentHistory = [
  {
    id: '1',
    agent: mockAgents[0],
    assignedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignedBy: {
      id: '4',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  {
    id: '2',
    agent: mockAgents[1],
    assignedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignedBy: {
      id: '4',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
]

export default function TicketAssigneePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // Filter agents based on search query
  const filteredAgents = mockAgents.filter((agent) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    )
  })

  const handleAssign = async () => {
    if (!selectedAgent) return
    setIsAssigning(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Handle successful assignment
    } catch (error) {
      console.error('Failed to assign ticket:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Assign Ticket</h2>
            <button
              onClick={handleAssign}
              disabled={!selectedAgent || isAssigning}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
                bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0052CC' }}
            >
              {isAssigning ? (
                'Assigning...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Assign
                </>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 rounded-lg \
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(
                  selectedAgent === agent.id ? null : agent.id
                )}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  selectedAgent === agent.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={selectedAgent === agent.id ? { borderColor: '#0052CC' } : {}}
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-500">{agent.email}</p>
                </div>
                {selectedAgent === agent.id && (
                  <Check className="w-5 h-5 text-primary" style={{ color: '#0052CC' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment History */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Assignment History</h2>
          </div>

          <div className="space-y-6">
            {mockAssignmentHistory.map((assignment) => (
              <div key={assignment.id} className="flex items-start gap-4">
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={assignment.agent.avatar || 'https://picsum.photos/200'}
                    alt={assignment.agent.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    Assigned to <span className="font-medium">{assignment.agent.name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    by {assignment.assignedBy.name} on{' '}
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 