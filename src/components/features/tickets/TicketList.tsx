'use client'

import { formatTicketStatus } from '@/lib/ticket-labels'
import React, { useState } from 'react';
import { type TicketListItem } from '@/lib/services';
import { format, isValid } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Checkbox } from '@/components/ui/checkbox'

interface TicketListProps {
  tickets: TicketListItem[]
  viewMode?: 'list' | 'grid'
  onTicketClick?: (ticketId: string) => void
}

export const TicketList: React.FC<TicketListProps> = ({ 
  tickets,
  onTicketClick
}) => {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])

  const handleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(tickets.map(t => t.id))
    }
  }

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'Date unavailable'
  }

  if (!tickets) return <div>No tickets found</div>

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={selectedTickets.length === tickets.length}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow 
              key={ticket.id}
              className="cursor-pointer"
              onClick={() => onTicketClick?.(ticket.id)}
            >
              <TableCell>
                <Checkbox 
                  checked={selectedTickets.includes(ticket.id)}
                  onCheckedChange={() => handleSelectTicket(ticket.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell>{ticket.title}</TableCell>
              <TableCell>{ticket.customer.name}</TableCell>
              <TableCell>{ticket.assignee?.name || 'Unassigned'}</TableCell>
              <TableCell>
                <Badge variant="outline">{ticket.priority}</Badge>
              </TableCell>
              <TableCell>
                <Badge>{formatTicketStatus(ticket.status)}</Badge>
              </TableCell>
              <TableCell>{formatDate(ticket.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default TicketList 