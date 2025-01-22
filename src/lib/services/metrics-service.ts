import { supabase } from '@/lib/supabase'
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
  async getTeamMetrics(teamId: string, period: MetricsPeriod): Promise<TeamMetrics> {
    try {
      // Get current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('team_metrics')
        .select('*')
        .eq('team_id', teamId)
        .single()

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

      const historical = (historyData || []).map((row: any) => ({
        team_id: row.team_id,
        average_response_time: row.average_response_time,
        average_resolution_time: row.average_resolution_time,
        customer_satisfaction_score: row.customer_satisfaction_score,
        open_tickets: row.open_tickets,
        resolved_tickets: row.resolved_tickets,
        updated_at: row.updated_at,
        timestamp: row.timestamp,
      }))

      // Trends - dummy calculations
      const trends: MetricsTrends = {
        responseTime: +((Math.random() * 10) - 5).toFixed(2),
        resolutionTime: +((Math.random() * 10) - 5).toFixed(2),
        satisfaction: +((Math.random() * 10) - 5).toFixed(2),
      }

      return {
        current,
        historical,
        trends,
      }
    } catch (error) {
      console.error('Failed to get team metrics:', error)
      // Return fallback
      return {
        current: {
          team_id: teamId,
          average_response_time: 0,
          average_resolution_time: 0,
          customer_satisfaction_score: 0,
          open_tickets: 0,
          resolved_tickets: 0,
          updated_at: new Date().toISOString(),
        },
        historical: [],
        trends: {
          responseTime: 0,
          resolutionTime: 0,
          satisfaction: 0,
        },
      }
    }
  },

  async getAgentMetrics(userId: string, period: MetricsPeriod): Promise<AgentMetrics> {
    try {
      // Current metrics
      const { data: currentData, error: currentError } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_id', userId)
        .single()

      const current: any = currentData || {
        agent_id: userId,
        average_response_time: 0,
        average_resolution_time: 0,
        tickets_handled: 0,
        satisfaction_score: 0,
        updated_at: new Date().toISOString(),
      }

      // Historical
      const { data: historyData, error: historyError } = await supabase
        .from('agent_metrics_history')
        .select('*')
        .eq('agent_id', userId)
        .order('timestamp', { ascending: false })
        .limit(30)

      const historical = (historyData || []).map((row: any) => ({
        agent_id: row.agent_id,
        average_response_time: row.average_response_time,
        average_resolution_time: row.average_resolution_time,
        tickets_handled: row.tickets_handled,
        satisfaction_score: row.satisfaction_score,
        updated_at: row.updated_at,
        timestamp: row.timestamp,
      }))

      // Dummy trends
      const trends: any = {
        responseTime: +((Math.random() * 10) - 5).toFixed(2),
        resolutionTime: +((Math.random() * 10) - 5).toFixed(2),
        satisfaction: +((Math.random() * 10) - 5).toFixed(2),
      }

      return {
        current,
        historical,
        trends,
      }
    } catch (error) {
      console.error('Failed to get agent metrics:', error)
      return {
        current: {
          agent_id: userId,
          average_response_time: 0,
          average_resolution_time: 0,
          tickets_handled: 0,
          satisfaction_score: 0,
          updated_at: new Date().toISOString(),
        },
        historical: [],
        trends: {
          responseTime: 0,
          resolutionTime: 0,
          satisfaction: 0,
        },
      }
    }
  },
}