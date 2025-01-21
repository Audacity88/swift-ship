'use client';

import { useState, useEffect } from 'react';
import type { WeeklySchedule, DaySchedule, TeamSchedule } from '@/types/team';
import { teamService } from '@/lib/services/team-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface CoverageScheduleProps {
  teamId: string;
  onUpdate?: () => void;
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultDaySchedule: DaySchedule = {
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
  assignedMembers: [],
};

const defaultSchedule: TeamSchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule },
  sunday: { ...defaultDaySchedule },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const CoverageSchedule = ({ teamId, onUpdate }: CoverageScheduleProps) => {
  const [schedule, setSchedule] = useState<TeamSchedule>(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  // Load schedule and available timezones
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const teamSchedule = await teamService.getTeamSchedule(teamId);
        if (teamSchedule) {
          setSchedule(teamSchedule);
        }
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load schedule');
        console.error('Failed to load schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    // Get list of available timezones
    const zones = Intl.supportedValuesOf('timeZone');
    setAvailableTimezones(zones);

    loadSchedule();
  }, [teamId]);

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleTimezoneChange = (timezone: string) => {
    setSchedule(prev => ({
      ...prev,
      timezone,
    }));
  };

  const toggleDayEnabled = (day: DayOfWeek) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].enabled 
        ? { ...prev[day], enabled: false }
        : { ...defaultDaySchedule, enabled: true },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const success = await teamService.updateTeamSchedule(teamId, schedule);
      if (success) {
        onUpdate?.();
      } else {
        setError('Failed to save schedule');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading schedule...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Coverage Schedule</h2>
        <div className="w-[300px]">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={schedule.timezone || 'UTC'}
            onValueChange={handleTimezoneChange}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {availableTimezones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-[100px]">
                  <Button
                    variant={schedule[day].enabled ? 'default' : 'outline'}
                    onClick={() => toggleDayEnabled(day)}
                    className="w-full"
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Button>
                </div>
                {schedule[day].enabled ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor={`${day}-start`}>Start Time</Label>
                      <Input
                        id={`${day}-start`}
                        type="time"
                        value={schedule[day].startTime}
                        onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label htmlFor={`${day}-end`}>End Time</Label>
                      <Input
                        id={`${day}-end`}
                        type="time"
                        value={schedule[day].endTime}
                        onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-muted-foreground text-sm">
                    No coverage scheduled
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Schedule'
          )}
        </Button>
      </div>
    </div>
  );
}; 