'use client'

import TicketList from '@/components/features/tickets/TicketList'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { fetchTickets } from '@/lib/services/ticket-service'
import { TicketPriority,TicketStatus } from '@/types/enums'
import { useQuery } from '@tanstack/react-query'
import { useRouter,useSearchParams } from 'next/navigation'
import { Suspense,useEffect,useState } from 'react'

function SearchTicketsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams?.get('q') || ''
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const { data, isLoading, error } = useQuery({
    queryKey: ['search-tickets', debouncedQuery, status, priority],
    queryFn: () => fetchTickets(undefined, {
      filters: { search: debouncedQuery, status: status ? [status] : undefined, priority: priority ? [priority] : undefined },
      pagination: { page: 1, pageSize: 100 }
    })
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search Tickets</h1>
      <div className="flex flex-wrap gap-3 rounded-lg border p-4">
        <Input className="min-w-0 flex-1 basis-full sm:basis-auto" type="search" aria-label="Search tickets by title" placeholder="Search tickets by title..." value={query} onChange={event => setQuery(event.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Any status</option>
          {Object.values(TicketStatus).map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </select>
        <select className="rounded border px-3 py-2 text-sm" aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)}>
          <option value="">Any priority</option>
          {Object.values(TicketPriority).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {error ? <p role="alert" className="text-destructive">Tickets could not be searched. Please try again.</p> : isLoading ? <p>Searching tickets...</p> : (
        <><p className="text-sm text-muted-foreground">{data?.total || 0} tickets found</p><TicketList tickets={data?.data || []} onTicketClick={id => router.push(`/tickets/${id}`)} /></>
      )}
    </div>
  )
}

export default function SearchTicketsPage() {
  return <Suspense fallback={<p>Loading search...</p>}><SearchTicketsContent /></Suspense>
}
