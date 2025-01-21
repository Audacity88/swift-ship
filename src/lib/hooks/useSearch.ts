import { useState } from 'react'
import { Ticket } from '@/types/ticket'
import { SearchResult, SearchFilters } from '@/types/search'

export function useSearch() {
  const [results, setResults] = useState<SearchResult<Ticket>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTickets = async (query: string, filters?: SearchFilters) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const searchParams = new URLSearchParams({
        q: query,
        ...(filters && { filters: JSON.stringify(filters) }),
      })
      
      const response = await fetch(`/api/tickets/search?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to search tickets')
      }
      
      const data = await response.json()
      setResults(data.results)
      return data.results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  return {
    searchTickets,
    results,
    isLoading,
    error,
  }
} 