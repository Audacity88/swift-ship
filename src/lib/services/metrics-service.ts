import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type {
  MetricsPeriod,
  TeamMetrics,
  AgentMetrics,
  TeamMetricsData,
  AgentMetricsData,
  MetricsTrends,
} from '@/types/metrics'

/*
  The code in TeamMetrics, PerformanceCharts, etc. references:
  getTeamMetrics(teamId, period)
  getAgentMetrics(userId, period)

  We'll store metrics in "team_metrics" and "agent_metrics" tables,
  plus we might store historical data in "team_metrics_history" or "agent_metrics_history".
*/
export const metricsService = {
  async getTeamMetrics(context: ServerContext, teamId: string, period: MetricsPeriod): Promise<TeamMetrics> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // Get current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('team_metrics')
        .select('*')
        .eq('team_id', teamId)
        .single()

      if (currentError) {
        console.error('Failed to get current team metrics:', currentError)
        throw currentError
      }

      const current: TeamMetricsData = currentData || {
        team_id: teamId,
        average_response_time: 0,
        average_resolution_time: 0,
        customer_satisfaction_score: 0,
        open_tickets: 0,
        resolved_tickets: 0,
        updated_at: new Date().toISOString(),
      }

      // Get historical data
      const { data: historyData, error: historyError } = await supabase
        .from('team_metrics_history')
        .select('*')
        .eq('team_id', teamId)
        .order('timestamp', { ascending: false })
        .limit(30)

      if (historyError) {
        console.error('Failed to get team metrics history:', historyError)
        throw historyError
      }

      const historical = (historyData || []).map((row: any) => ({
        team_id: row.team_id,
        average_response_time: row.average_response_time,
        average_resolution_time: row.average_resolution_time,
        customer_satisfaction_score: row.customer_satisfaction_score,
        open_tickets: row.open_tickets,
        resolved_tickets: row.resolved_tickets,
        timestamp: row.timestamp,
      }))

      // Calculate trends
      const trends: MetricsTrends = {
        response_time: this.calculateTrend(historical, 'average_response_time'),
        resolution_time: this.calculateTrend(historical, 'average_resolution_time'),
        satisfaction: this.calculateTrend(historical, 'customer_satisfaction_score'),
        volume: this.calculateTrend(historical, 'open_tickets'),
      }

      return {
        current,
        historical,
        trends,
      }
    } catch (error) {
      console.error('Error in getTeamMetrics:', error)
      throw error
    }
  },

  async getAgentMetrics(context: ServerContext, userId: string, period: MetricsPeriod): Promise<AgentMetrics> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // Get current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (currentError) {
        console.error('Failed to get current agent metrics:', currentError)
        throw currentError
      }

      const current: AgentMetricsData = currentData || {
        user_id: userId,
        tickets_resolved: 0,
        average_response_time: 0,
        average_resolution_time: 0,
        customer_satisfaction_score: 0,
        updated_at: new Date().toISOString(),
      }

      // Get historical data
      const { data: historyData, error: historyError } = await supabase
        .from('agent_metrics_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(30)

      if (historyError) {
        console.error('Failed to get agent metrics history:', historyError)
        throw historyError
      }

      const historical = (historyData || []).map((row: any) => ({
        user_id: row.user_id,
        tickets_resolved: row.tickets_resolved,
        average_response_time: row.average_response_time,
        average_resolution_time: row.average_resolution_time,
        customer_satisfaction_score: row.customer_satisfaction_score,
        timestamp: row.timestamp,
      }))

      // Calculate trends
      const trends: MetricsTrends = {
        response_time: this.calculateTrend(historical, 'average_response_time'),
        resolution_time: this.calculateTrend(historical, 'average_resolution_time'),
        satisfaction: this.calculateTrend(historical, 'customer_satisfaction_score'),
        volume: this.calculateTrend(historical, 'tickets_resolved'),
      }

      return {
        current,
        historical,
        trends,
      }
    } catch (error) {
      console.error('Error in getAgentMetrics:', error)
      throw error
    }
  },

  calculateTrend(data: any[], field: string): number {
    if (!data || data.length < 2) return 0

    const latest = data[0][field]
    const previous = data[data.length - 1][field]

    return ((latest - previous) / previous) * 100
  }
}