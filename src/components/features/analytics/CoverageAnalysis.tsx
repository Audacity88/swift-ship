'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklySchedule } from '@/types/team';
import { HeatMap } from '@/components/ui/heat-map';

interface CoverageAnalysisProps {
  schedule: WeeklySchedule;
  timezone: string;
}

export function CoverageAnalysis({ schedule, timezone }: CoverageAnalysisProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Convert schedule data to heatmap format
  const heatmapData = days.map(day => ({
    name: day,
    data: hours.map(hour => {
      const daySchedule = schedule[day.toLowerCase() as keyof WeeklySchedule];
      if (!daySchedule?.enabled) return 0;

      const startHour = parseInt(daySchedule.startTime.split(':')[0]);
      const endHour = parseInt(daySchedule.endTime.split(':')[0]);

      // Count number of team members available at this hour
      return (hour >= startHour && hour < endHour) ? daySchedule.assignedMembers.length : 0;
    }),
  }));

  const maxCoverage = Math.max(
    ...heatmapData.flatMap(day => day.data)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Coverage Analysis</CardTitle>
        <span className="text-sm text-muted-foreground">
          Timezone: {timezone}
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <HeatMap
            data={heatmapData}
            xLabels={hours.map(h => `${h}:00`)}
            yLabels={days}
            xLabel="Hour of Day"
            yLabel="Day of Week"
            colors={[
              '#f3f4f6', // gray-100 (no coverage)
              '#dbeafe', // blue-100
              '#93c5fd', // blue-300
              '#3b82f6', // blue-500
              '#1d4ed8', // blue-700
            ]}
            maxValue={maxCoverage}
            tooltip={(value) => `${value} team members available`}
          />
        </div>
      </CardContent>
    </Card>
  );
} 