'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Clock, User } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { TicketStatus, TicketPriority, Tag } from '@/types/ticket'
import { auditService } from '@/lib/services'

interface TicketSnapshotData {
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string;
  title: string;
  description: string;
  metadata: {
    tags?: Tag[];
  };
}

interface TicketSnapshot {
  id: string;
  ticketId: string;
  snapshotAt: string;
  data: TicketSnapshotData;
  reason?: string;
  triggeredBy: {
    name: string;
    avatar?: string;
  };
}

interface Change {
  field: string;
  from?: string;
  to: string;
}

interface AuditLogViewerProps {
  ticketId: string;
}

export const AuditLogViewer = ({ ticketId }: AuditLogViewerProps) => {
  const [snapshots, setSnapshots] = useState<TicketSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        const logs = await auditService.getAuditLogs()
        const ticketLogs = logs.filter(log => log.entity_id === ticketId && log.entity_type === 'ticket')
        setSnapshots(ticketLogs.map(log => ({
          id: log.id,
          ticketId: log.entity_id,
          snapshotAt: log.created_at,
          data: log.changes as TicketSnapshotData,
          reason: log.change_reason,
          triggeredBy: {
            name: log.actor_name || 'Unknown',
            avatar: log.actor_avatar
          }
        })))
      } catch (error) {
        console.error('Failed to load snapshots:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSnapshots()
  }, [ticketId])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!snapshots.length) {
    return <div className="text-center text-gray-500">No history available</div>
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {snapshots.map((snapshot, index) => {
          const prevSnapshot = snapshots[index + 1]
          const changes = getChanges(prevSnapshot?.data ?? null, snapshot.data)

          return (
            <div
              key={snapshot.id}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {snapshot.triggeredBy.avatar ? (
                    <img
                      src={snapshot.triggeredBy.avatar}
                      alt={snapshot.triggeredBy.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                  <span className="font-medium">
                    {snapshot.triggeredBy.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(snapshot.snapshotAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              </div>

              {snapshot.reason && (
                <div className="text-sm text-gray-600">
                  Reason: {snapshot.reason}
                </div>
              )}

              <div className="space-y-1">
                {changes.map((change, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{change.field}:</span>{' '}
                    {change.from && (
                      <>
                        <Badge variant="outline" className="mr-2">
                          {change.from}
                        </Badge>
                        →
                      </>
                    )}
                    <Badge variant="outline" className="ml-2">
                      {change.to}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function getChanges(prev: TicketSnapshotData | null, current: TicketSnapshotData): Change[] {
  if (!prev) return []

  const changes: Change[] = []
  const fields = ['status', 'priority', 'assigneeId', 'title', 'description'] as const

  for (const field of fields) {
    if (prev[field] !== current[field]) {
      changes.push({
        field: field.charAt(0).toUpperCase() + field.slice(1),
        from: prev[field]?.toString() ?? '',
        to: current[field]?.toString() ?? ''
      })
    }
  }

  // Check for tag changes
  const prevTags = new Set(prev.metadata?.tags?.map(t => t.id) ?? [])
  const currentTags = new Set(current.metadata?.tags?.map(t => t.id) ?? [])

  if (prevTags.size !== currentTags.size || 
      [...prevTags].some(id => !currentTags.has(id))) {
    changes.push({
      field: 'Tags',
      from: prev.metadata?.tags?.map(t => t.name).join(', ') ?? '',
      to: current.metadata?.tags?.map(t => t.name).join(', ') ?? ''
    })
  }

  return changes
} 