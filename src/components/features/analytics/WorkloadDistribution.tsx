'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentMetrics } from '@/types/metrics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WorkloadDistributionProps {
  agentMetrics: AgentMetrics[];
}

export function WorkloadDistribution({ agentMetrics }: WorkloadDistributionProps) {
  const chartData = agentMetrics.map(metrics => ({
    name: metrics.current.agent_id,
    tickets: metrics.current.tickets_handled,
    responseTime: metrics.current.average_response_time,
    resolutionTime: metrics.current.average_resolution_time,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Team Members',
                  position: 'insideBottom',
                  offset: -5
                }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Tickets Handled',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  switch (name) {
                    case 'tickets':
                      return [`${value} tickets`, 'Tickets Handled'];
                    case 'responseTime':
                      return [`${value} min`, 'Avg Response Time'];
                    case 'resolutionTime':
                      return [`${value} hrs`, 'Avg Resolution Time'];
                    default:
                      return [value, name];
                  }
                }}
              />
              <Bar 
                dataKey="tickets" 
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 