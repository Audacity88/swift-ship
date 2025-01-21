'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricsPeriod, TeamMetrics } from '@/types/metrics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartsProps {
  metrics: TeamMetrics;
  onPeriodChange: (period: MetricsPeriod) => void;
}

export function PerformanceCharts({ metrics, onPeriodChange }: PerformanceChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'response' | 'resolution' | 'satisfaction'>('response');

  const chartData = metrics.historical.map(entry => ({
    timestamp: new Date(entry.updated_at).toLocaleDateString(),
    responseTime: entry.average_response_time,
    resolutionTime: entry.average_resolution_time,
    satisfaction: entry.customer_satisfaction_score,
  })).reverse();

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'response':
        return '#2563eb'; // blue-600
      case 'resolution':
        return '#16a34a'; // green-600
      case 'satisfaction':
        return '#ca8a04'; // yellow-600
      default:
        return '#6b7280'; // gray-500
    }
  };

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'response':
        return {
          dataKey: 'responseTime',
          label: 'Response Time',
          unit: 'minutes',
          color: getMetricColor('response'),
        };
      case 'resolution':
        return {
          dataKey: 'resolutionTime',
          label: 'Resolution Time',
          unit: 'hours',
          color: getMetricColor('resolution'),
        };
      case 'satisfaction':
        return {
          dataKey: 'satisfaction',
          label: 'Customer Satisfaction',
          unit: '%',
          color: getMetricColor('satisfaction'),
        };
    }
  };

  const metricData = getMetricData();

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Performance Trends</CardTitle>
        <div className="flex items-center gap-4">
          <Select
            value={selectedMetric}
            onValueChange={(value: 'response' | 'resolution' | 'satisfaction') => 
              setSelectedMetric(value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="response">Response Time</SelectItem>
              <SelectItem value="resolution">Resolution Time</SelectItem>
              <SelectItem value="satisfaction">Satisfaction</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value: MetricsPeriod) => onPeriodChange(value)}
            defaultValue="week"
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">24 Hours</SelectItem>
              <SelectItem value="week">7 Days</SelectItem>
              <SelectItem value="month">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ 
                  value: `${metricData.label} (${metricData.unit})`,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={metricData.dataKey}
                stroke={metricData.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 