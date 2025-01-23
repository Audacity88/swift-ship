import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export const searchService = {
  async getSearchAnalytics(context: ServerContext, timeRange: string): Promise<any> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .rpc('get_search_analytics', { time_range: timeRange })

      if (error || !data) {
        console.error('Failed to get search analytics:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getSearchAnalytics:', error)
      return {
        total_searches: 0,
        avg_response_time: 0,
        failure_rate: 0,
      }
    }
  },

  async getTopSearchTerms(context: ServerContext, timeRange: string, limit: number): Promise<Array<{ term: string; count: number }>> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .rpc('get_top_search_terms', { time_range: timeRange, limit })

      if (error || !data) {
        console.error('Failed to get top search terms:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getTopSearchTerms:', error)
      return []
    }
  },

  async getSearchesByDay(context: ServerContext, timeRange: string): Promise<Array<{ date: string; count: number }>> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .rpc('get_searches_by_day', { time_range: timeRange })

      if (error || !data) {
        console.error('Failed to get searches by day:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getSearchesByDay:', error)
      return []
    }
  },

  async getFailedSearches(context: ServerContext, timeRange: string): Promise<any[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

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
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getFailedSearches:', error)
      return []
    }
  },
}