'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { LifeBuoy, MessageSquare, Plus, Search } from 'lucide-react'
import Link from 'next/link'

interface Ticket {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

export default function SupportDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTickets = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/tickets/customer', {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error('Failed to fetch tickets')
        }
        const data = await response.json()
        setTickets(data.tickets || [])
      } catch (error) {
        console.error('Failed to load tickets:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTickets()
  }, [user])

  if (!user) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Support Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage your support tickets</p>
        </div>
        <Link
          href="/portal/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/portal/contact"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Contact Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get help from our team</p>
            </div>
          </div>
        </Link>
        <Link
          href="/portal/knowledge-base"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Search Knowledge Base</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Find answers quickly</p>
            </div>
          </div>
        </Link>
        <Link
          href="/portal/help-center"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LifeBuoy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Help Center</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Browse guides & FAQs</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Tickets</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No tickets found. Create one to get started.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <Link href={`/tickets/${ticket.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last updated: {new Date(ticket.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      ticket.status === 'open' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : ticket.status === 'closed'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 