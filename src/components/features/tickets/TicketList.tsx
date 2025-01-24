'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { fetchTickets, type TicketListItem } from '@/lib/services'
import { format } from 'date-fns'
import {
  Clock,
  Tag,
  User,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCcw,
  Archive,
  MoreHorizontal,
  Download,
  Trash,
  CheckSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { SLAIndicator } from '@/components/features/tickets/SLAIndicator'
import { TagList } from '@/components/features/tags/TagList'
import type { TicketListItem as TicketListItemType } from '@/types/ticket'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface TicketListProps {
  tickets: TicketListItem[]
  viewMode?: 'list' | 'grid'
  onTicketClick?: (ticketId: string) => void
}

export const TicketList: React.FC<TicketListProps> = ({ 
  tickets,
  viewMode = 'list',
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
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
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
                <Badge>{ticket.status}</Badge>
              </TableCell>
              <TableCell>{formatDate(ticket.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default TicketList 