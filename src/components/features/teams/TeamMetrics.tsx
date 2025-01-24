'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MetricsPeriod, TeamMetrics as TeamMetricsType, AgentMetrics } from '@/types/metrics';
import { metricsService, teamService } from '@/lib/services';
import { PerformanceCharts } from '@/components/features/analytics/PerformanceCharts';
import { WorkloadDistribution } from '@/components/features/analytics/WorkloadDistribution';
import { CoverageAnalysis } from '@/components/features/analytics/CoverageAnalysis';
import type { WeeklySchedule } from '@/types/team';

interface TeamMetricsProps {
  teamId: string;
}

interface TeamMember {
  user_id: string;
}

interface TeamData {
  schedule: WeeklySchedule;
  timezone?: string;
}

export function TeamMetrics({ teamId }: TeamMetricsProps) {
  const [metrics, setMetrics] = useState<TeamMetricsType | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [period, setPeriod] = useState<MetricsPeriod>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load team metrics and schedule data in parallel
        const [
          teamMetrics,
          teamMembers,
          teamData
        ] = await Promise.all([
          metricsService.getTeamMetrics(teamId, period),
          teamService.getTeamMembers(teamId),
          teamService.getTeamById(teamId)
        ]);

        setMetrics(teamMetrics);

        // Load agent metrics if we have team members
        if (teamMembers) {
          const agentMetricsData = await metricsService.getTeamAgentMetrics(
            teamId,
            teamMembers.map((m: TeamMember) => m.user_id),
            period
          );
          setAgentMetrics(agentMetricsData);
        }

        // Set schedule data
        if (teamData) {
          setSchedule(teamData.schedule);
          setTimezone(teamData.timezone || 'UTC');
        }

      } catch (err) {
        const error = err as Error;
        console.error('Error loading metrics:', error);
        setError(error.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [teamId, period]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  const getTrendBadgeVariant = (value: number) => {
    if (value === 0) return 'secondary';
    return value < 0 ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {Math.round(metrics.current.average_response_time)}m
              </div>
              <Badge variant={getTrendBadgeVariant(metrics.trends.responseTime)}>
                {metrics.trends.responseTime > 0 ? '+' : ''}
                {Math.round(metrics.trends.responseTime)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {Math.round(metrics.current.average_resolution_time)}h
              </div>
              <Badge variant={getTrendBadgeVariant(metrics.trends.resolutionTime)}>
                {metrics.trends.resolutionTime > 0 ? '+' : ''}
                {Math.round(metrics.trends.resolutionTime)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {Math.round(metrics.current.customer_satisfaction_score * 10) / 10}/5
              </div>
              <Badge variant={getTrendBadgeVariant(metrics.trends.satisfaction)}>
                {metrics.trends.satisfaction > 0 ? '+' : ''}
                {Math.round(metrics.trends.satisfaction)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {Math.round((metrics.current.resolved_tickets / 
                  (metrics.current.resolved_tickets + metrics.current.open_tickets)) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.current.resolved_tickets} / {metrics.current.resolved_tickets + metrics.current.open_tickets}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <PerformanceCharts
          metrics={metrics}
          onPeriodChange={setPeriod}
        />
        <WorkloadDistribution
          agentMetrics={agentMetrics}
        />
      </div>

      {/* Coverage Analysis */}
      {schedule && (
        <Card>
          <CardContent className="pt-6">
            <CoverageAnalysis
              schedule={schedule}
              timezone={timezone}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 