'use client';

import { useState, useEffect } from 'react';
import type { TeamCreationData, TeamUpdateData, DaySchedule, WeeklySchedule, TeamAgent, TeamMember } from '@/types/team';
import { teamService } from '@/lib/services/team-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { RoleType } from '@/types/role';


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
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load team data if editing
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const [availableAgents, team] = await Promise.all([
          teamService.getAvailableAgents(undefined),
          teamId ? teamService.getTeamById(undefined, teamId) : Promise.resolve(null),
        ]);
        setAgents(availableAgents);
        if (team) {
          setName(team.name);
          setDescription(team.description || '');
          setMembers(team.members);
          const lead = team.members.find(m => m.role === RoleType.SUPERVISOR);
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
        success = await teamService.updateTeam(undefined, updateData);
        if (success) {
          const leadMember = members.find(member => member.userId === teamLead);
          if (teamLead && !leadMember) {
            await teamService.addTeamMember(undefined, teamId, {
              userId: teamLead, role: RoleType.SUPERVISOR,
              schedule: defaultWeeklySchedule, skills: [],
            });
          } else if (leadMember && leadMember.role !== RoleType.SUPERVISOR) {
            await teamService.updateTeamMember({ teamId, userId: teamLead, role: RoleType.SUPERVISOR });
          }
          for (const member of members.filter(member => member.role === RoleType.SUPERVISOR && member.userId !== teamLead)) {
            await teamService.updateTeamMember({ teamId, userId: member.userId, role: RoleType.AGENT });
          }
        }
      } else {
        // Create new team
        const creationData: TeamCreationData = {
          name,
          description: description || undefined,
          schedule: defaultWeeklySchedule,
        };
        const team = await teamService.createTeam(undefined, {
          ...creationData,
          members: teamLead ? [{
            userId: teamLead, role: RoleType.SUPERVISOR,
            schedule: defaultWeeklySchedule, skills: [],
          }] : [],
        });
        success = !!team;
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
        <select
          id="teamLead"
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          disabled={isLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">No team lead</option>
          {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>)}
        </select>
        {!agents.length && <p className="text-sm text-muted-foreground">No agents available. Ask an administrator to add an agent first.</p>}
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
