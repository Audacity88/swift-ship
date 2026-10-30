'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { fetchTickets } from '@/lib/services/ticket-service'
import TicketList from '@/components/features/tickets/TicketList'
import { Button } from '@/components/ui/button'

export default function TeamQueuePage() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['team-queue'],
    queryFn: () => fetchTickets(undefined, { pagination: { page: 1, pageSize: 100 }, sort: { field: 'createdAt', direction: 'desc' } })
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Team Queue</h1>
        <Button variant="outline" onClick={() => void refetch()}>Refresh</Button>
      </div>
      {isLoading ? <p>Loading tickets...</p> : error ? <p role="alert" className="text-destructive">Tickets could not be loaded. Refresh to retry.</p> : (
        <><p className="text-sm text-muted-foreground">{data?.total || 0} tickets</p><TicketList tickets={data?.data || []} onTicketClick={id => router.push(`/tickets/${id}`)} /></>
      )}
    </div>
  )
}
