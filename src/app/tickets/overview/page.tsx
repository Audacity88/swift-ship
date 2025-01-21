'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Clock, MessageSquare, Users } from 'lucide-react'
import { TicketList } from '@/components/features/tickets/TicketList'
import { TicketStatus, TicketPriority } from '@/types/enums'
import type { TicketListItem } from '@/types/ticket'

// Mock data - replace with actual API calls
const mockStats = [
  {
    label: 'Open Tickets',
    value: '156',
    change: '+12%',
    icon: BarChart3,
    color: '#0052CC',
  },
  {
    label: 'Avg Response Time',
    value: '2.5h',
    change: '-30m',
    icon: Clock,
    color: '#00B8D9',
  },
  {
    label: 'Customer Satisfaction',
    value: '94%',
    change: '+2%',
    icon: Users,
    color: '#36B37E',
  },
  {
    label: 'Total Conversations',
    value: '1.2k',
    change: '+15%',
    icon: MessageSquare,
    color: '#6554C0',
  },
]

// Mock tickets - replace with actual API calls
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

export default function TicketsOverviewPage() {
  const router = useRouter()
  
  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets Overview</h1>
        <div className="flex items-center gap-4">
          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Statistics Grid */}
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
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-blue-600'
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

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
          <button className="text-sm text-primary hover:text-primary/90 font-medium">
            View all tickets
          </button>
        </div>
        <TicketList tickets={mockTickets} onTicketClick={handleTicketClick} />
      </div>
    </div>
  )
} 