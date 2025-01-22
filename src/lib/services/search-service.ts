import { supabase } from '@/lib/supabase'

export const searchService = {
  async getSearchAnalytics(timeRange: string): Promise<any> {
    // Example aggregator
    const { data, error } = await supabase
      .rpc('get_search_analytics', { time_range: timeRange })

    if (error || !data) {
      console.error('Failed to get search analytics:', error)
      return {
        total_searches: 0,
        avg_response_time: 0,
        failure_rate: 0,
      }
    }
    return data
  },

  async getTopSearchTerms(timeRange: string, limit: number): Promise<Array<{ term: string; count: number }>> {
    const { data, error } = await supabase
      .rpc('get_top_search_terms', { time_range: timeRange, limit })

    if (error || !data) {
      console.error('Failed to get top search terms:', error)
      return []
    }
    return data
  },

  async getSearchesByDay(timeRange: string): Promise<Array<{ date: string; count: number }>> {
    const { data, error } = await supabase
      .rpc('get_searches_by_day', { time_range: timeRange })

    if (error || !data) {
      console.error('Failed to get searches by day:', error)
      return []
    }
    return data
  },

  async getFailedSearches(timeRange: string): Promise<any[]> {
    const now = Date.now()
    let days = 7
    if (timeRange === '30d') days = 30
    else if (timeRange === '90d') days = 90

    const fromDate = new Date(now - days * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('failed_searches')
      .select('*')
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Failed to get failed searches:', error)
      return []
    }
    return data
  },
}