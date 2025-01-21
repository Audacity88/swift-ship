export interface TimeMetric {
  average: number;  // in minutes
  median: number;   // in minutes
  min: number;      // in minutes
  max: number;      // in minutes
}

export interface TicketMetrics {
  responseTime: TimeMetric;
  resolutionTime: TimeMetric;
  openTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  reopenedTickets: number;
}

export interface SatisfactionMetrics {
  averageRating: number;        // 1-5 scale
  totalResponses: number;
  responsesDistribution: {
    [rating: number]: number;   // Count of each rating
  };
  npsScore?: number;           // Net Promoter Score if implemented
}

export interface WorkloadMetrics {
  activeTicketsCount: number;
  ticketsAssignedToday: number;
  ticketsResolvedToday: number;
  averageTicketsPerDay: number;
  peakHours: {
    hour: number;              // 0-23
    ticketCount: number;
  }[];
}

export interface TeamPerformanceMetrics {
  teamId: string;
  period: {
    start: Date;
    end: Date;
  };
  tickets: TicketMetrics;
  satisfaction: SatisfactionMetrics;
  workload: WorkloadMetrics;
  updatedAt: Date;
}

export interface AgentPerformanceMetrics {
  userId: string;
  teamId: string;
  period: {
    start: Date;
    end: Date;
  };
  tickets: TicketMetrics;
  satisfaction: SatisfactionMetrics;
  workload: WorkloadMetrics;
  skillUtilization: {
    [skillName: string]: number;  // Percentage of tickets using this skill
  };
  updatedAt: Date;
}

export interface BaseMetrics {
  average_response_time: number;
  average_resolution_time: number;
  response_count: number;
  resolution_count: number;
  updated_at: string;
}

export interface TeamMetricsData extends BaseMetrics {
  team_id: string;
  customer_satisfaction_score: number;
  open_tickets: number;
  resolved_tickets: number;
}

export interface AgentMetricsData extends BaseMetrics {
  agent_id: string;
  tickets_handled: number;
  satisfaction_score: number;
}

export interface MetricsTrends {
  responseTime: number;
  resolutionTime: number;
  satisfaction: number;
}

export interface TeamMetrics {
  current: TeamMetricsData;
  historical: TeamMetricsData[];
  trends: MetricsTrends;
}

export interface AgentMetrics {
  current: AgentMetricsData;
  historical: AgentMetricsData[];
  trends: MetricsTrends;
}

export type MetricsPeriod = 'day' | 'week' | 'month';

export interface TeamMetricsHistoryEntry extends TeamMetricsData {
  timestamp: string;
}

export interface AgentMetricsHistoryEntry extends AgentMetricsData {
  timestamp: string;
}

export interface MetricsQuery {
  period: MetricsPeriod;
  startDate?: Date;
  endDate?: Date;
  teamId?: string;
  userId?: string;
} 