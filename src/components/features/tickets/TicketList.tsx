'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Tag, User } from 'lucide-react'
import type { TicketListItem } from '@/types/ticket'

interface TicketListProps {
  tickets: TicketListItem[]
  viewMode?: 'list' | 'grid'
}

const statusColors = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export function TicketList({ tickets, viewMode = 'list' }: TicketListProps) {
  return (
    <div className={`grid gap-4 ${
      viewMode === 'grid' 
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
        : 'grid-cols-1'
    }`}>
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/tickets/${ticket.id}`}
          className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors \
            ${viewMode === 'grid' ? 'p-4' : 'p-4 flex items-start gap-4'}`}
        >
          {/* Customer Avatar */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={ticket.customer.avatar || 'https://picsum.photos/200'}
              alt={ticket.customer.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Ticket Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {ticket.customer.name} - {ticket.customer.email}
                </p>
              </div>

              {/* Status & Priority */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[ticket.status]
                }`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  priorityColors[ticket.priority]
                }`}>
                  {ticket.priority}
                </span>
              </div>
            </div>

            {/* Meta Information */}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.assignee && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{ticket.assignee.name}</span>
                </div>
              )}
              {ticket.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  <span>{ticket.tags.length} tags</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
} 