'use client';

import { useState, useEffect } from 'react';
import type { Team, TeamCreationData, TeamUpdateData, WeeklySchedule, DaySchedule } from '@/types/team';
import { teamService } from '@/lib/services/team-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types/role';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TeamFormProps {
  teamId?: string;
  onSubmit?: (success: boolean) => void;
  onCancel?: () => void;
}

const defaultDaySchedule: DaySchedule = {
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
  assignedMembers: [],
};

const defaultWeeklySchedule: WeeklySchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule },
  sunday: { ...defaultDaySchedule },
};

export const TeamForm = ({
  teamId,
  onSubmit,
  onCancel,
}: TeamFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!teamId);

  // Load team data if editing
  useEffect(() => {
    const loadTeam = async () => {
      if (!teamId) {
        setInitialLoading(false);
        return;
      }

      try {
        const team = await teamService.getTeamById(teamId);
        if (team) {
          setName(team.name);
          setDescription(team.description || '');
          const lead = team.members.find(m => m.role === UserRole.MANAGER);
          if (lead) {
            setTeamLead(lead.userId);
          }
        }
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load team data');
        console.error('Failed to load team data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Team name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      let success: boolean;

      if (teamId) {
        // Update existing team
        const updateData: TeamUpdateData = {
          id: teamId,
          name,
          description: description || undefined,
        };
        success = await teamService.updateTeam(updateData);
      } else {
        // Create new team
        const creationData: TeamCreationData = {
          name,
          description: description || undefined,
          schedule: defaultWeeklySchedule,
        };
        const team = await teamService.createTeam(creationData);
        success = !!team;

        // If team was created and team lead is specified, add them as a member
        if (success && team && teamLead) {
          await teamService.addTeamMember({
            teamId: team.id,
            userId: teamLead,
            role: UserRole.MANAGER,
            schedule: defaultWeeklySchedule,
            skills: [],
            joinedAt: new Date(),
          });
        }
      }

      if (success) {
        onSubmit?.(true);
      } else {
        setError('Failed to save team. Please try again.');
        onSubmit?.(false);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred');
      onSubmit?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-center py-8">Loading team data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Team Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter team name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter team description"
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamLead">Team Lead</Label>
        <Input
          id="teamLead"
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          placeholder="Enter team lead's user ID"
          disabled={isLoading}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {teamId ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            teamId ? 'Save Team' : 'Create Team'
          )}
        </Button>
      </div>
    </div>
  );
}; 