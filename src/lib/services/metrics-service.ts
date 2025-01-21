import { createClient } from '@supabase/supabase-js';
import { TeamMetrics, AgentMetrics, MetricsTrends, TeamMetricsData, AgentMetricsData } from '@/types/metrics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class MetricsService {
  // Response Time Tracking
  async trackResponseTime(ticketId: string, responseTime: number) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('team_id, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) return;

    // Update team metrics
    await this.updateTeamResponseTime(ticket.team_id, responseTime);
    
    // Update agent metrics
    if (ticket.assigned_to) {
      await this.updateAgentResponseTime(ticket.assigned_to, responseTime);
    }
  }

  // Resolution Time Tracking
  async trackResolutionTime(ticketId: string, resolutionTime: number) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('team_id, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) return;

    // Update team metrics
    await this.updateTeamResolutionTime(ticket.team_id, resolutionTime);
    
    // Update agent metrics
    if (ticket.assigned_to) {
      await this.updateAgentResolutionTime(ticket.assigned_to, resolutionTime);
    }
  }

  // Team Performance Stats
  async getTeamMetrics(teamId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<TeamMetrics> {
    const { data: metrics } = await supabase
      .from('team_metrics')
      .select('*')
      .eq('team_id', teamId)
      .single();

    const { data: historicalMetrics } = await supabase
      .from('team_metrics_history')
      .select('*')
      .eq('team_id', teamId)
      .gte('timestamp', this.getPeriodStart(period))
      .order('timestamp', { ascending: false });

    return {
      current: metrics || this.getEmptyTeamMetrics(),
      historical: historicalMetrics || [],
      trends: this.calculateTrends(historicalMetrics || [])
    };
  }

  // Agent Performance Stats
  async getAgentMetrics(agentId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<AgentMetrics> {
    const { data: metrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    const { data: historicalMetrics } = await supabase
      .from('agent_metrics_history')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', this.getPeriodStart(period))
      .order('timestamp', { ascending: false });

    return {
      current: metrics || this.getEmptyAgentMetrics(),
      historical: historicalMetrics || [],
      trends: this.calculateTrends(historicalMetrics || [])
    };
  }

  // Real-time Metrics Updates
  private async updateTeamResponseTime(teamId: string, newTime: number) {
    const { data: current } = await supabase
      .from('team_metrics')
      .select('average_response_time, response_count')
      .eq('team_id', teamId)
      .single();

    const newAverage = this.calculateNewAverage(
      current?.average_response_time || 0,
      current?.response_count || 0,
      newTime
    );

    await supabase
      .from('team_metrics')
      .upsert({
        team_id: teamId,
        average_response_time: newAverage,
        response_count: (current?.response_count || 0) + 1,
        updated_at: new Date().toISOString()
      });
  }

  private async updateTeamResolutionTime(teamId: string, newTime: number) {
    const { data: current } = await supabase
      .from('team_metrics')
      .select('average_resolution_time, resolution_count')
      .eq('team_id', teamId)
      .single();

    const newAverage = this.calculateNewAverage(
      current?.average_resolution_time || 0,
      current?.resolution_count || 0,
      newTime
    );

    await supabase
      .from('team_metrics')
      .upsert({
        team_id: teamId,
        average_resolution_time: newAverage,
        resolution_count: (current?.resolution_count || 0) + 1,
        updated_at: new Date().toISOString()
      });
  }

  private async updateAgentResponseTime(agentId: string, newTime: number) {
    const { data: current } = await supabase
      .from('agent_metrics')
      .select('average_response_time, response_count')
      .eq('agent_id', agentId)
      .single();

    const newAverage = this.calculateNewAverage(
      current?.average_response_time || 0,
      current?.response_count || 0,
      newTime
    );

    await supabase
      .from('agent_metrics')
      .upsert({
        agent_id: agentId,
        average_response_time: newAverage,
        response_count: (current?.response_count || 0) + 1,
        updated_at: new Date().toISOString()
      });
  }

  private async updateAgentResolutionTime(agentId: string, newTime: number) {
    const { data: current } = await supabase
      .from('agent_metrics')
      .select('average_resolution_time, resolution_count')
      .eq('agent_id', agentId)
      .single();

    const newAverage = this.calculateNewAverage(
      current?.average_resolution_time || 0,
      current?.resolution_count || 0,
      newTime
    );

    await supabase
      .from('agent_metrics')
      .upsert({
        agent_id: agentId,
        average_resolution_time: newAverage,
        resolution_count: (current?.resolution_count || 0) + 1,
        updated_at: new Date().toISOString()
      });
  }

  // Helper Functions
  private calculateNewAverage(currentAvg: number, count: number, newValue: number): number {
    return ((currentAvg * count) + newValue) / (count + 1);
  }

  private getPeriodStart(period: 'day' | 'week' | 'month'): string {
    const date = new Date();
    switch (period) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
    }
    return date.toISOString();
  }

  private calculateTrends(historicalData: TeamMetricsData[] | AgentMetricsData[]): MetricsTrends {
    if (historicalData.length < 2) {
      return {
        responseTime: 0,
        resolutionTime: 0,
        satisfaction: 0
      };
    }

    const latest = historicalData[0];
    const previous = historicalData[historicalData.length - 1];

    return {
      responseTime: this.calculatePercentageChange(
        previous.average_response_time,
        latest.average_response_time
      ),
      resolutionTime: this.calculatePercentageChange(
        previous.average_resolution_time,
        latest.average_resolution_time
      ),
      satisfaction: this.calculatePercentageChange(
        'customer_satisfaction_score' in latest 
          ? (latest as TeamMetricsData).customer_satisfaction_score
          : (latest as AgentMetricsData).satisfaction_score,
        'customer_satisfaction_score' in previous
          ? (previous as TeamMetricsData).customer_satisfaction_score
          : (previous as AgentMetricsData).satisfaction_score
      )
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private getEmptyTeamMetrics() {
    return {
      average_response_time: 0,
      average_resolution_time: 0,
      response_count: 0,
      resolution_count: 0,
      customer_satisfaction_score: 0,
      updated_at: new Date().toISOString()
    };
  }

  private getEmptyAgentMetrics() {
    return {
      average_response_time: 0,
      average_resolution_time: 0,
      response_count: 0,
      resolution_count: 0,
      tickets_handled: 0,
      updated_at: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const metricsService = new MetricsService(); 