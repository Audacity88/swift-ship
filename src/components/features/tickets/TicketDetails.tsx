'use client'

import Image from 'next/image'
import { Clock, Tag, User, MessageSquare, Paperclip, Link as LinkIcon } from 'lucide-react'
import type { Ticket } from '@/types/ticket'

interface TicketDetailsProps {
  ticket: Ticket
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

export function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Ticket Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden">
              <Image
                src={ticket.customer.avatar || 'https://picsum.photos/200'}
                alt={ticket.customer.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {ticket.customer.name} - {ticket.customer.email}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[ticket.status]
            }`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              priorityColors[ticket.priority]
            }`}>
              {ticket.priority}
            </span>
          </div>
        </div>

        {/* Meta Information */}
        <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Created {new Date(ticket.metadata.createdAt).toLocaleDateString()}</span>
          </div>
          {ticket.assignee && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Assigned to {ticket.assignee.name}</span>
            </div>
          )}
          {ticket.metadata.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <div className="flex items-center gap-1">
                {ticket.metadata.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {ticket.messages.length > 0 && (
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{ticket.messages.length} messages</span>
            </div>
          )}
          {ticket.linkedProblems && ticket.linkedProblems.length > 0 && (
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              <span>{ticket.linkedProblems.length} linked problems</span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Description */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Description</h2>
        <p className="mt-2 text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Messages Thread */}
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Messages</h2>
        <div className="space-y-6">
          {ticket.messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={message.author.avatar || 'https://picsum.photos/200'}
                  alt={message.author.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{message.author.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-gray-600 whitespace-pre-wrap">{message.content}</div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 \
                          bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Paperclip className="w-4 h-4" />
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 