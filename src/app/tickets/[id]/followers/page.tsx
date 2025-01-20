'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, UserPlus, Bell, BellOff, X } from 'lucide-react'
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

interface NotificationPreference {
  all: boolean
  comments: boolean
  status: boolean
  assignment: boolean
}

export default function TicketFollowersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [followers, setFollowers] = useState<Agent[]>([mockAgents[0], mockAgents[1]])
  const [preferences, setPreferences] = useState<NotificationPreference>({
    all: true,
    comments: true,
    status: true,
    assignment: true,
  })

  // Filter agents based on search query
  const filteredAgents = mockAgents.filter((agent) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    )
  })

  const isFollowing = (agentId: string) => {
    return followers.some(follower => follower.id === agentId)
  }

  const toggleFollower = (agent: Agent) => {
    setFollowers(prev => 
      isFollowing(agent.id)
        ? prev.filter(f => f.id !== agent.id)
        : [...prev, agent]
    )
  }

  const togglePreference = (key: keyof NotificationPreference) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Followers */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Followers</h2>
            <span className="text-sm text-gray-500">
              {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
            </span>
          </div>

          {/* Current Followers List */}
          <div className="space-y-4">
            {followers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={follower.avatar}
                      alt={follower.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{follower.name}</h3>
                    <p className="text-sm text-gray-500">{follower.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollower(follower)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Followers */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Add Followers</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 rounded-lg \
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgents.map((agent) => {
                const following = isFollowing(agent.id)
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleFollower(agent)}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      following
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={following ? { borderColor: '#0052CC' } : {}}
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
                    {following ? (
                      <BellOff className="w-5 h-5 text-primary" style={{ color: '#0052CC' }} />
                    ) : (
                      <UserPlus className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            {Object.entries(preferences).map(([key, value]) => (
              <button
                key={key}
                onClick={() => togglePreference(key as keyof NotificationPreference)}
                className="flex items-center justify-between w-full p-4 rounded-lg border \
                  border-gray-200 hover:border-gray-300 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {key === 'all' ? 'All notifications' : `${key} updates`}
                </span>
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    value ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  style={value ? { backgroundColor: '#0052CC' } : {}}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform \
                      mt-1 ${value ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 