'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Users, BarChart3, Clock, AlertTriangle } from 'lucide-react'
import { TicketList } from '@/components/features/tickets/TicketList'
import { TicketStatus, TicketPriority } from '@/types/enums'
import type { TicketListItem, Agent } from '@/types/ticket'

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
    assignee: mockAgents[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [
      { id: '1', name: 'bug', color: '#DE350B' },
      { id: '2', name: 'dashboard', color: '#00B8D9' },
    ],
  },
  // Add more mock tickets as needed
]

const mockStats = [
  {
    label: 'Team Load',
    value: '73%',
    change: '+5%',
    icon: Users,
    color: '#0052CC',
  },
  {
    label: 'Open Tickets',
    value: '24',
    change: '-3',
    icon: BarChart3,
    color: '#00B8D9',
  },
  {
    label: 'Avg Response',
    value: '1.8h',
    change: '-0.3h',
    icon: Clock,
    color: '#36B37E',
  },
  {
    label: 'SLA at Risk',
    value: '3',
    change: '+1',
    icon: AlertTriangle,
    color: '#FF5630',
  },
]

export default function TeamQueuePage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Filter tickets based on selected agent
  const filteredTickets = mockTickets.filter((ticket) => {
    if (!selectedAgent) return true
    return ticket.assignee?.id === selectedAgent
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Team Queue</h1>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg \
            hover:bg-primary/90 transition-colors"
          style={{ backgroundColor: '#0052CC' }}
        >
          Auto-assign Tickets
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-red-600' : 'text-green-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-gray-900">{stat.value}</h3>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Team Members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAgents.map((agent) => (
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
                  src={agent.avatar || '/default-avatar.png'}
                  alt={agent.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-500">{agent.email}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900">8</span>
                <p className="text-xs text-gray-500">tickets</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Ticket Queue
            {selectedAgent && (
              <span className="ml-2 text-sm text-gray-500">
                for {mockAgents.find(a => a.id === selectedAgent)?.name}
              </span>
            )}
          </h2>
          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option>Sort by Priority</option>
            <option>Sort by Date</option>
            <option>Sort by SLA</option>
          </select>
        </div>
        <TicketList tickets={filteredTickets} />
      </div>
    </div>
  )
} 