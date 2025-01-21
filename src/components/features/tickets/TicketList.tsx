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
import type { TicketListItem } from '@/types/ticket'
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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  })
  const [sort, setSort] = useState({
    field: 'createdAt',
    direction: 'desc' as 'asc' | 'desc'
  })
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])

  useEffect(() => {
    loadTickets()
  }, [filters, pagination.page, pagination.pageSize, sort])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const response = await fetchTickets({
        filters: {
          ...(filters.status && { status: [filters.status] }),
          ...(filters.priority && { priority: [filters.priority] }),
          ...(filters.search && { search: filters.search }),
        },
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize
        },
        sort: {
          field: sort.field,
          direction: sort.direction
        }
      })
      setTickets(response.data)
      setPagination(prev => ({ ...prev, total: response.total }))
      setLoading(false)
    } catch (err) {
      setError('Error loading tickets')
      setLoading(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePriorityChange = (value: string) => {
    setFilters(prev => ({ ...prev, priority: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (value: string) => {
    setPagination(prev => ({ ...prev, pageSize: parseInt(value), page: 1 }))
  }

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

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

  const handleBulkAction = async (action: 'archive' | 'delete') => {
    if (!selectedTickets.length) return

    try {
      setLoading(true)
      const endpoint = action === 'archive' ? '/api/tickets/bulk/archive' : '/api/tickets/bulk/delete'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds: selectedTickets })
      })

      if (!response.ok) throw new Error(`Failed to ${action} tickets`)

      loadTickets()
      setSelectedTickets([])
    } catch (err) {
      setError(`Error performing bulk ${action}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tickets/export?format=${format}&ids=${selectedTickets.join(',')}`)
      
      if (!response.ok) throw new Error('Failed to export tickets')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets-export.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error exporting tickets')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[180px]" aria-label="priority">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedTickets.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedTickets.length === tickets.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('title')}
              >
                Title
                {sort.field === 'title' && (
                  sort.direction === 'desc' ? <ChevronDown className="ml-2 h-4 w-4 inline" /> : <ChevronUp className="ml-2 h-4 w-4 inline" />
                )}
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('priority')}
              >
                Priority
                {sort.field === 'priority' && (
                  sort.direction === 'desc' ? <ChevronDown className="ml-2 h-4 w-4 inline" /> : <ChevronUp className="ml-2 h-4 w-4 inline" />
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('status')}
              >
                Status
                {sort.field === 'status' && (
                  sort.direction === 'desc' ? <ChevronDown className="ml-2 h-4 w-4 inline" /> : <ChevronUp className="ml-2 h-4 w-4 inline" />
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('createdAt')}
              >
                Created
                {sort.field === 'createdAt' && (
                  sort.direction === 'desc' ? <ChevronDown className="ml-2 h-4 w-4 inline" /> : <ChevronUp className="ml-2 h-4 w-4 inline" />
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow 
                key={ticket.id}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('button')) return
                  onTicketClick?.(ticket.id)
                }}
                className={onTicketClick ? 'cursor-pointer hover:bg-gray-50' : ''}
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
                  <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(ticket.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rows per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 ||
                page === totalPages ||
                Math.abs(page - pagination.page) <= 1
              )
              .map((page, i, arr) => {
                if (i > 0 && arr[i - 1] !== page - 1) {
                  return (
                    <React.Fragment key={`ellipsis-${page}`}>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === pagination.page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  )
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === pagination.page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export default TicketList 