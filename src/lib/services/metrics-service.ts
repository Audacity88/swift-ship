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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('team_metrics')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle()

      if (currentError) {
        console.error('Failed to get current team metrics:', currentError)
        throw currentError
      }

      const current: TeamMetricsData = currentData || {
        team_id: teamId,
        response_count: 0,
        resolution_count: 0,
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
        .gte('timestamp', new Date(Date.now() - ({ day: 1, week: 7, month: 30 })[period] * 86400000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(30)

      if (historyError) {
        console.error('Failed to get team metrics history:', historyError)
        throw historyError
      }

      const historical: TeamMetricsData[] = (historyData || []).map((row: Record<string, string | number>) => ({
        team_id: String(row.team_id),
        average_response_time: Number(row.average_response_time),
        average_resolution_time: Number(row.average_resolution_time),
        customer_satisfaction_score: Number(row.customer_satisfaction_score),
        open_tickets: Number(row.open_tickets), resolved_tickets: Number(row.resolved_tickets),
        updated_at: String(row.timestamp), response_count: 0, resolution_count: 0,
      }))

      // Calculate trends
      const trends: MetricsTrends = {
        responseTime: this.calculateTrend(historical, 'average_response_time'),
        resolutionTime: this.calculateTrend(historical, 'average_resolution_time'),
        satisfaction: this.calculateTrend(historical, 'customer_satisfaction_score'),
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Get current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (currentError) {
        console.error('Failed to get current agent metrics:', currentError)
        throw currentError
      }

      const current: AgentMetricsData = {
        agent_id: userId,
        tickets_handled: currentData?.tickets_resolved || 0,
        average_response_time: currentData?.average_response_time || 0,
        average_resolution_time: currentData?.average_resolution_time || 0,
        satisfaction_score: currentData?.customer_satisfaction_score || 0,
        response_count: 0, resolution_count: 0,
        updated_at: currentData?.updated_at || new Date().toISOString(),
      }

      // Get historical data
      const { data: historyData, error: historyError } = await supabase
        .from('agent_metrics_history')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - ({ day: 1, week: 7, month: 30 })[period] * 86400000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(30)

      if (historyError) {
        console.error('Failed to get agent metrics history:', historyError)
        throw historyError
      }

      const historical: AgentMetricsData[] = (historyData || []).map(row => ({
        agent_id: userId, tickets_handled: row.tickets_resolved || 0,
        average_response_time: row.average_response_time || 0,
        average_resolution_time: row.average_resolution_time || 0,
        satisfaction_score: row.customer_satisfaction_score || 0,
        response_count: 0, resolution_count: 0, updated_at: row.timestamp,
      }))

      // Calculate trends
      const trends: MetricsTrends = {
        responseTime: this.calculateTrend(historical, 'average_response_time'),
        resolutionTime: this.calculateTrend(historical, 'average_resolution_time'),
        satisfaction: this.calculateTrend(historical, 'satisfaction_score'),
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

  calculateTrend(data: object[], field: string): number {
    if (!data || data.length < 2) return 0

    const latest = Number((data[0] as Record<string, unknown>)[field])
    const previous = Number((data[data.length - 1] as Record<string, unknown>)[field])
    if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) return 0

    return ((latest - previous) / previous) * 100
  }
}