'use client'

import React, { useEffect, useState } from 'react'
import { fetchTickets } from '@/lib/services/ticket-service'
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
  MoreHorizontal
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
import { SLAIndicator } from '@/components/features/tickets/SLAIndicator'
import { TagList } from '@/components/features/tags/TagList'
import type { TicketListItem } from '@/types/ticket'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface TicketListProps {
  tickets: TicketListItem[]
  viewMode?: 'list' | 'grid'
  onTicketClick?: (ticketId: string) => void
}

const TicketList: React.FC<TicketListProps> = ({ 
  tickets: initialTickets,
  viewMode = 'list',
  onTicketClick
}) => {
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  })
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadTickets()
  }, [filters, page])

  const loadTickets = async () => {
    try {
      const response = await fetchTickets({
        filters: {
          ...(filters.status && { status: [filters.status] }),
          ...(filters.priority && { priority: [filters.priority] }),
          ...(filters.search && { search: filters.search }),
        },
        page,
      })
      setTickets(response.data)
      setLoading(false)
    } catch (err) {
      setError('Error loading tickets')
      setLoading(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }))
  }

  const handlePriorityChange = (value: string) => {
    setFilters(prev => ({ ...prev, priority: value }))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
  }

  const handleNextPage = () => {
    setPage(prev => prev + 1)
  }

  // Expose handlers for testing
  if (process.env.NODE_ENV === 'test') {
    ;(window as any).__TEST_HANDLERS__ = {
      handleStatusChange,
      handlePriorityChange,
      handleSearch,
      handleNextPage
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Search tickets"
          value={filters.search}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]" aria-label="status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open" role="option">Open</SelectItem>
            <SelectItem value="in_progress" role="option">In Progress</SelectItem>
            <SelectItem value="closed" role="option">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-[180px]" aria-label="priority">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high" role="option">High</SelectItem>
            <SelectItem value="medium" role="option">Medium</SelectItem>
            <SelectItem value="low" role="option">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                onClick={() => onTicketClick?.(ticket.id)}
                className={onTicketClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                <TableCell>{ticket.title}</TableCell>
                <TableCell>{ticket.customer.name}</TableCell>
                <TableCell>{ticket.assignee?.name || 'Unassigned'}</TableCell>
                <TableCell>
                  <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" aria-label="next" onClick={handleNextPage}>
          Next
        </Button>
      </div>
    </div>
  )
}

export default TicketList 