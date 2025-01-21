'use client'

import { UsersRound, UserCog, BarChart, Clock } from 'lucide-react'

export default function TeamsPage() {
  const teams = [
    {
      id: 1,
      name: 'Customer Support',
      description: 'Front-line support team handling customer inquiries',
      memberCount: 12,
      activeTickets: 23,
      avgResponseTime: '15m',
      lead: 'Sarah Johnson',
    },
    {
      id: 2,
      name: 'Technical Support',
      description: 'Advanced technical issue resolution team',
      memberCount: 8,
      activeTickets: 15,
      avgResponseTime: '30m',
      lead: 'Michael Brown',
    },
    {
      id: 3,
      name: 'VIP Support',
      description: 'Dedicated team for premium customers',
      memberCount: 5,
      activeTickets: 7,
      avgResponseTime: '5m',
      lead: 'John Smith',
    },
    {
      id: 4,
      name: 'Escalations',
      description: 'Handling complex and escalated issues',
      memberCount: 6,
      activeTickets: 10,
      avgResponseTime: '45m',
      lead: 'Emily Davis',
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-gray-600">Manage your support teams and their members</p>
        </div>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          style={{ backgroundColor: '#0066FF' }}
        >
          <UsersRound className="w-4 h-4" />
          Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{team.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{team.description}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <UsersRound className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Members</div>
                  <div className="font-semibold">{team.memberCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <BarChart className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Active</div>
                  <div className="font-semibold">{team.activeTickets}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg. Response</div>
                  <div className="font-semibold">{team.avgResponseTime}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <UserCog className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Team Lead</div>
                  <div className="font-semibold truncate">{team.lead}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                View Details
              </button>
              <button className="px-3 py-1 text-sm text-primary hover:text-primary-dark">
                Manage Team
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 