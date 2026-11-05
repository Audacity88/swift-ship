'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { TicketStatus } from '@/types/ticket'
import { statusWorkflow } from '@/lib/services/status-workflow'
import type { StatusTransition as Transition } from '@/types/status-workflow'

interface StatusTransitionProps {
  ticketId: string
  currentStatus: TicketStatus
  onStatusChange: (newStatus: TicketStatus, reason?: string) => Promise<void>
  className?: string
}

const colors: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-blue-500',
  [TicketStatus.IN_PROGRESS]: 'bg-yellow-500',
  [TicketStatus.WAITING]: 'bg-purple-500',
  [TicketStatus.RESOLVED]: 'bg-green-500',
  [TicketStatus.CLOSED]: 'bg-gray-500'
}
const label = (status: TicketStatus) => status === TicketStatus.WAITING ? 'Awaiting response' : status.replace(/_/g, ' ')

export function StatusTransition({ ticketId, currentStatus, onStatusChange, className = '' }: StatusTransitionProps) {
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    statusWorkflow.getAvailableTransitions(undefined, ticketId, currentStatus)
      .then(result => { if (active) setTransitions(result) })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Status options could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId, currentStatus])

  const changeStatus = async () => {
    if (!selectedStatus) return
    setSaving(true)
    setError('')
    try {
      const validation = await statusWorkflow.validateTransition(undefined, ticketId, currentStatus, selectedStatus)
      if (!validation.valid) throw new Error(validation.message || 'Status transition is not allowed')
      await onStatusChange(selectedStatus, reason.trim() || undefined)
      setDialogOpen(false)
      setSelectedStatus(null)
      setReason('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Status could not be updated. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={loading || saving} aria-label="Change ticket status">
            <Badge className={colors[currentStatus]}>{label(currentStatus)}</Badge>
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-w-[calc(100vw-1rem)] p-2" align="end" collisionPadding={8}>
          <div className="grid gap-1">
            {transitions.length === 0 && <p className="p-2 text-sm text-muted-foreground">No status changes available.</p>}
            {transitions.map(transition => <Button key={transition.toStatus} variant="ghost" className="justify-start capitalize" onClick={() => {
              setSelectedStatus(transition.toStatus)
              setReason('')
              setError('')
              setDialogOpen(true)
            }}>{label(transition.toStatus)}</Button>)}
          </div>
        </PopoverContent>
      </Popover>
      {error && !dialogOpen && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update status</DialogTitle>
            <DialogDescription>Change ticket status to {selectedStatus && label(selectedStatus)}.</DialogDescription>
          </DialogHeader>
          <label htmlFor="status-reason" className="text-sm font-medium">Reason for change (optional)</label>
          <Textarea id="status-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Add context for the next person handling this ticket." />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving || !selectedStatus} onClick={() => void changeStatus()}>{saving ? 'Updating...' : 'Update status'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
