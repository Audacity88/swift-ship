'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { AlertCircle, Clock, Pause, CheckCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TicketListItem } from '@/types/ticket'

interface SLAIndicatorProps {
  ticket: TicketListItem
  className?: string
}

export function SLAIndicator({
  ticket,
  className = ''
}: SLAIndicatorProps) {
  // State
  const [slaState, setSlaState] = useState<{
    name: string
    deadline: Date
    isPaused: boolean
    isBreached: boolean
    isCompleted: boolean
    progress: number
    timeLeft: string
  } | null>(null)

  // Load SLA state
  useEffect(() => {
    const loadSlaState = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticket.id}/sla`)
        const data = await response.json()
        setSlaState(data)
      } catch (error) {
        console.error('Failed to load SLA state:', error)
      }
    }

    loadSlaState()
  }, [ticket.id])

  if (!slaState) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <Clock className="w-4 h-4" />
        <span>No SLA</span>
      </div>
    )
  }

  // Get status color
  const getStatusColor = () => {
    if (slaState.isBreached) return 'text-red-500'
    if (slaState.isPaused) return 'text-yellow-500'
    if (slaState.isCompleted) return 'text-green-500'
    if (slaState.progress >= 75) return 'text-orange-500'
    return 'text-blue-500'
  }

  // Get progress color
  const getProgressColor = () => {
    if (slaState.isBreached) return 'bg-red-500'
    if (slaState.isPaused) return 'bg-yellow-500'
    if (slaState.isCompleted) return 'bg-green-500'
    if (slaState.progress >= 75) return 'bg-orange-500'
    return 'bg-blue-500'
  }

  // Get status icon
  const StatusIcon = () => {
    if (slaState.isBreached) return <AlertCircle className="w-4 h-4" />
    if (slaState.isPaused) return <Pause className="w-4 h-4" />
    if (slaState.isCompleted) return <CheckCircle className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1 ${className}`}>
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              <StatusIcon />
              <span className="text-sm font-medium">
                {slaState.name}
                {slaState.isPaused && ' (Paused)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={slaState.progress}
                className="flex-1 h-2"
                indicatorClassName={getProgressColor()}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {slaState.timeLeft}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{slaState.name}</p>
            <p className="text-sm">
              Deadline: {format(slaState.deadline, 'MMM d, yyyy HH:mm')}
              <br />
              Time Left: {formatDistanceToNow(slaState.deadline)}
              {slaState.isPaused && ' (Paused)'}
            </p>
            {slaState.isBreached && (
              <p className="text-sm text-red-500">
                SLA Breached
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 