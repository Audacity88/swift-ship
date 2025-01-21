'use client'

import { useState, useEffect } from 'react'
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import type { TicketStatus } from '@/types/ticket'

interface StatusTransition {
  status: TicketStatus
  requiredRole?: string
  conditions?: {
    type: string
    message: string
  }[]
}

interface StatusTransitionProps {
  ticketId: string
  currentStatus: TicketStatus
  onStatusChange: (newStatus: TicketStatus, reason?: string) => Promise<void>
  className?: string
}

export function StatusTransition({
  ticketId,
  currentStatus,
  onStatusChange,
  className = ''
}: StatusTransitionProps) {
  // State
  const [availableTransitions, setAvailableTransitions] = useState<StatusTransition[]>([])
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available transitions
  useEffect(() => {
    const loadTransitions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/tickets/${ticketId}/status`)
        const data = await response.json()
        setAvailableTransitions(data.data || [])
      } catch (error) {
        console.error('Failed to load status transitions:', error)
        setError('Failed to load available status transitions')
      } finally {
        setIsLoading(false)
      }
    }

    loadTransitions()
  }, [ticketId, currentStatus])

  // Get status badge color
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500'
      case 'in_progress':
        return 'bg-yellow-500'
      case 'resolved':
        return 'bg-green-500'
      case 'closed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedStatus) return

    setIsLoading(true)
    setError(null)

    try {
      await onStatusChange(selectedStatus, reason.trim() || undefined)
      setIsDialogOpen(false)
      setSelectedStatus(null)
      setReason('')

      // Refresh transitions
      const { data: transitions } = await fetch(`/api/tickets/${ticketId}/status`).then(res => res.json())
      setAvailableTransitions(transitions.data || [])
    } catch (error) {
      console.error('Failed to update status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if status has conditions
  const getStatusConditions = (status: TicketStatus) => {
    const transition = availableTransitions.find(t => t.status === status)
    return transition?.conditions || []
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[150px]"
            disabled={isLoading}
          >
            <Badge className={getStatusColor(currentStatus)}>
              {currentStatus.replace('_', ' ')}
            </Badge>
            {isLoading ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="grid gap-1">
            {availableTransitions.map(transition => {
              const conditions = getStatusConditions(transition.status)
              const hasConditions = conditions.length > 0

              return (
                <Button
                  key={transition.status}
                  variant="ghost"
                  className="justify-start font-normal"
                  onClick={() => {
                    setSelectedStatus(transition.status)
                    setIsDialogOpen(true)
                  }}
                >
                  <Badge className={getStatusColor(transition.status)}>
                    {transition.status.replace('_', ' ')}
                  </Badge>
                  {hasConditions && (
                    <AlertTriangle className="w-4 h-4 ml-2 text-yellow-500" />
                  )}
                </Button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change the ticket status to{' '}
              {selectedStatus?.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>

          {/* Status Conditions */}
          {selectedStatus && getStatusConditions(selectedStatus).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-500">Requirements</h4>
              <ul className="space-y-1 text-sm">
                {getStatusConditions(selectedStatus).map((condition, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    {condition.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason for Change (Optional)
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter a reason for this status change..."
              className="h-20"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 