'use client'

import { useState } from 'react'
import { Archive, RotateCcw, History, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Ticket, Agent, TicketSnapshot } from '@/types/ticket'
import { archiveService } from '@/lib/services'

interface ArchiveActionsProps {
  ticket: Ticket
  currentAgent: Agent
  onUpdate: (ticket: Ticket) => void
  className?: string
}

export function ArchiveActions({
  ticket,
  currentAgent,
  onUpdate,
  className = ''
}: ArchiveActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [snapshots, setSnapshots] = useState<TicketSnapshot[]>([])
  const [showSnapshotsDialog, setShowSnapshotsDialog] = useState(false)

  const isArchived = !!ticket.metadata?.archivedAt

  const handleArchive = async () => {
    setError(undefined)
    setIsLoading(true)

    try {
      const archivedTicket = await archiveService.archiveTicket(
        ticket,
        currentAgent,
        archiveReason
      )
      onUpdate(archivedTicket)
      setShowArchiveDialog(false)
    } catch (err) {
      setError('Failed to archive ticket')
      console.error('Archive error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async () => {
    setError(undefined)
    setIsLoading(true)

    try {
      const restoredTicket = await archiveService.restoreTicket(ticket, currentAgent)
      onUpdate(restoredTicket)
    } catch (err) {
      setError('Failed to restore ticket')
      console.error('Restore error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSnapshots = async () => {
    setError(undefined)
    setIsLoading(true)

    try {
      const ticketSnapshots = await archiveService.getTicketSnapshots(ticket.id)
      setSnapshots(ticketSnapshots)
      setShowSnapshotsDialog(true)
    } catch (err) {
      setError('Failed to load snapshots')
      console.error('Snapshot load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreSnapshot = async (snapshotId: string) => {
    setError(undefined)
    setIsLoading(true)

    try {
      const restoredTicket = await archiveService.restoreSnapshot(
        ticket,
        snapshotId,
        currentAgent
      )
      onUpdate(restoredTicket)
      setShowSnapshotsDialog(false)
    } catch (err) {
      setError('Failed to restore snapshot')
      console.error('Snapshot restore error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-x-2 ${className}`}>
      {!isArchived ? (
        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600"
              disabled={isLoading}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Reason for archiving (optional)"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleArchive}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Archiving...' : 'Archive Ticket'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600"
          onClick={handleRestore}
          disabled={isLoading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore
        </Button>
      )}

      <Dialog open={showSnapshotsDialog} onOpenChange={setShowSnapshotsDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSnapshots}
            disabled={isLoading}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {snapshots.length > 0 ? (
              <div className="space-y-4">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(snapshot.snapshotAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          By: {snapshot.triggeredBy.name}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreSnapshot(snapshot.id)}
                        disabled={isLoading}
                      >
                        Restore
                      </Button>
                    </div>
                    {snapshot.reason && (
                      <p className="text-sm text-gray-600">
                        Reason: {snapshot.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No snapshots available
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="mr-1 h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
} 