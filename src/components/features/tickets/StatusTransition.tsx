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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { TicketStatus } from '@/types/enums'
import { statusWorkflow } from '@/lib/services/status-workflow'
import type { StatusTransition as StatusTransitionType, TransitionCondition } from '@/types/status-workflow'

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
  const [availableTransitions, setAvailableTransitions] = useState<StatusTransitionType[]>([])
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
        setError(null)
        const transitions = await statusWorkflow.getAvailableTransitions(ticketId, currentStatus)
        setAvailableTransitions(transitions)
      } catch (error) {
        console.error('Failed to load status transitions:', error)
        const errorMessage = error instanceof Error && error.message === 'Unauthorized' 
          ? 'Please sign in to view available status transitions.'
          : 'Unable to load status transitions. Please try again later.'
        setError(errorMessage)
        setAvailableTransitions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTransitions()
  }, [ticketId, currentStatus])

  // Get status badge color
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-500'
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-500'
      case TicketStatus.AWAITING_RESPONSE:
        return 'bg-purple-500'
      case TicketStatus.RESOLVED:
        return 'bg-green-500'
      case TicketStatus.CLOSED:
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
      // Validate transition first
      const isValid = await statusWorkflow.validateTransition(ticketId, currentStatus, selectedStatus)
      if (!isValid) {
        setError('This status transition is not allowed')
        return
      }

      await onStatusChange(selectedStatus, reason.trim() || undefined)
      setIsDialogOpen(false)
      setSelectedStatus(null)
      setReason('')

      // Refresh transitions
      const transitions = await statusWorkflow.getAvailableTransitions(ticketId, selectedStatus)
      setAvailableTransitions(transitions)
    } catch (error) {
      console.error('Failed to update status:', error)
      setError('Failed to update status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if status has conditions
  const getStatusConditions = (transition: StatusTransitionType): TransitionCondition[] => {
    return transition.conditions || []
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm ${error.includes('sign in') ? 'text-amber-500' : 'text-red-500'} ${className}`}>
        {error.includes('sign in') ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
        {error}
      </div>
    )
  }

  // Group transitions by toStatus to remove duplicates and filter out current status
  const uniqueTransitions = Array.from(
    new Map(availableTransitions
      .filter(t => t.toStatus !== currentStatus)
      .map(t => [t.toStatus, t])
    ).values()
  )

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
              {currentStatus}
            </Badge>
            {isLoading ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-50 p-2" align="start">
          <div className="grid gap-1">
            {uniqueTransitions.map(transition => {
              const conditions = getStatusConditions(transition)
              const hasConditions = conditions.length > 0

              return (
                <Button
                  key={`${transition.fromStatus}-${transition.toStatus}`}
                  variant="ghost"
                  className="justify-start font-normal"
                  onClick={() => {
                    setSelectedStatus(transition.toStatus)
                    setIsDialogOpen(true)
                  }}
                >
                  <Badge className={getStatusColor(transition.toStatus)}>
                    {transition.toStatus}
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
              {selectedStatus}
            </DialogDescription>
          </DialogHeader>

          {/* Status Conditions */}
          {selectedStatus && getStatusConditions(availableTransitions.find(t => t.toStatus === selectedStatus) || {} as StatusTransitionType).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-500">Requirements</h4>
              <ul className="space-y-1 text-sm">
                {getStatusConditions(availableTransitions.find(t => t.toStatus === selectedStatus) || {} as StatusTransitionType).map((condition, index) => (
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