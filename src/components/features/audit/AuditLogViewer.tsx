'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCcw,
  User,
  Bot,
  AlertCircle,
  Plus,
  Minus,
  Edit,
  Trash,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  AuditLog,
  AuditLogAction,
  AuditLogActorType,
  AuditLogFilters,
  AuditLogSort
} from '@/types/audit'

interface AuditLogViewerProps {
  entityType?: string
  entityId?: string
  className?: string
}

export function AuditLogViewer({
  entityType,
  entityId,
  className = ''
}: AuditLogViewerProps) {
  // State
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>({
    entity_type: entityType ? [entityType] : undefined,
    entity_id: entityId,
    date_from: undefined,
    date_to: undefined,
    actor_type: undefined,
    action: undefined,
    search: undefined
  })
  const [sort, setSort] = useState<AuditLogSort>({
    field: 'created_at',
    direction: 'desc'
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Load audit logs
  const loadLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters,
          sort,
          pagination: {
            page,
            per_page: 10
          }
        })
      }).then(res => res.json())

      setLogs(response.data)
      setTotalPages(Math.ceil(response.pagination.total / response.pagination.per_page))
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setError('Failed to load audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  // Load logs when filters, sort, or page changes
  useEffect(() => {
    loadLogs()
  }, [filters, sort, page])

  // Get action icon
  const getActionIcon = (action: AuditLogAction) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="w-4 h-4" />
      case 'UPDATE':
        return <Edit className="w-4 h-4" />
      case 'DELETE':
        return <Trash className="w-4 h-4" />
      default:
        return <ArrowUpDown className="w-4 h-4" />
    }
  }

  // Get actor icon
  const getActorIcon = (type: AuditLogActorType) => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />
      case 'agent':
        return <User className="w-4 h-4" />
      case 'system':
        return <Bot className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  // Format changes
  const formatChanges = (changes: Record<string, any>) => {
    const { old = {}, new: updated = {} } = changes
    const allKeys = new Set([...Object.keys(old), ...Object.keys(updated)])

    return Array.from(allKeys).map(key => {
      const oldValue = old[key]
      const newValue = updated[key]

      return {
        key,
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: newValue === undefined ? null : newValue
      }
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Audit Log</h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Date Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <span>From</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.date_from ? new Date(filters.date_from) : undefined}
                          onSelect={date => setFilters(prev => ({
                            ...prev,
                            date_from: date?.toISOString()
                          }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <span>To</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.date_to ? new Date(filters.date_to) : undefined}
                          onSelect={date => setFilters(prev => ({
                            ...prev,
                            date_to: date?.toISOString()
                          }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Actor Type</h4>
                  <Select
                    value={filters.actor_type?.[0] || ''}
                    onValueChange={value => setFilters(prev => ({
                      ...prev,
                      actor_type: value ? [value as AuditLogActorType] : undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Action</h4>
                  <Select
                    value={filters.action?.[0] || ''}
                    onValueChange={value => setFilters(prev => ({
                      ...prev,
                      action: value ? [value as AuditLogAction] : undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      <SelectItem value="INSERT">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Audit Log List */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {logs.map(log => (
            <div
              key={log.id}
              className="p-4 bg-gray-50 rounded-lg space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getActorIcon(log.actor.type)}
                  <span className="font-medium">
                    {log.actor.name || 'System'}
                  </span>
                  <Badge variant="secondary">
                    {log.actor.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {getActionIcon(log.action)}
                  <span>
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              </div>

              {/* Changes */}
              <div className="space-y-2">
                {formatChanges(log.changes).map(({ key, oldValue, newValue }) => (
                  <div key={key} className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-medium">{key}</div>
                    <div className="text-red-500">
                      {oldValue === null ? '-' : JSON.stringify(oldValue)}
                    </div>
                    <div className="text-green-500">
                      {newValue === null ? '-' : JSON.stringify(newValue)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="text-sm text-gray-500">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span>{' '}
                      {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <span className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || isLoading}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
} 