'use client'

import { useState, useEffect } from 'react'
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

interface TicketListProps {
  className?: string
  showArchived?: boolean
  tickets?: TicketListItem[]
  viewMode?: 'list' | 'grid'
  onTicketClick?: (ticketId: string) => void
  onArchive?: (ticketId: string) => void
  onUnarchive?: (ticketId: string) => void
}

export function TicketList({
  className = '',
  showArchived = false,
  tickets: externalTickets,
  viewMode = 'list',
  onTicketClick,
  onArchive,
  onUnarchive
}: TicketListProps) {
  // State
  const [internalTickets, setInternalTickets] = useState<TicketListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sort, setSort] = useState<{
    field: keyof TicketListItem | 'sla'
    direction: 'asc' | 'desc'
  }>({
    field: 'updatedAt',
    direction: 'desc'
  })

  // Use external tickets if provided, otherwise load from API
  const tickets = externalTickets || internalTickets

  // Load tickets only if no external tickets provided
  const loadTickets = async () => {
    if (externalTickets) return
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          showArchived,
          sort
        })
      }).then(res => res.json())

      setInternalTickets(response.data)
    } catch (error) {
      console.error('Failed to load tickets:', error)
      // TODO: Show error toast
    } finally {
      setIsLoading(false)
    }
  }

  // Load tickets on mount and when sort/showArchived changes
  useEffect(() => {
    loadTickets()
  }, [sort, showArchived])

  // Handle sort change
  const handleSort = (field: typeof sort.field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Render sort indicator
  const renderSortIndicator = (field: typeof sort.field) => {
    if (sort.field !== field) return null
    return sort.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500'
      case 'in_progress':
        return 'bg-yellow-500'
      case 'waiting':
        return 'bg-purple-500'
      case 'resolved':
        return 'bg-green-500'
      case 'closed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {showArchived ? 'Archived Tickets' : 'Active Tickets'}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* TODO: Show filters */}}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={isLoading}
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('updatedAt')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Last Updated
                  {renderSortIndicator('updatedAt')}
                </div>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Tags
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Assignee
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('sla')}
              >
                SLA
                {renderSortIndicator('sla')}
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCcw className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <AlertCircle className="w-6 h-6" />
                    <p>No tickets found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map(ticket => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onTicketClick?.(ticket.id)}
                >
                  <TableCell>
                    {format(new Date(ticket.updatedAt), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-sm text-gray-500">
                      {ticket.customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TagList tags={ticket.tags} limit={3} />
                  </TableCell>
                  <TableCell>
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        {ticket.assignee.avatar && (
                          <img
                            src={ticket.assignee.avatar}
                            alt={ticket.assignee.name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span>{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SLAIndicator ticket={ticket} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {showArchived ? (
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              onUnarchive?.(ticket.id)
                            }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              onArchive?.(ticket.id)
                            }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 