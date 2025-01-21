'use client';

import { useState, useEffect } from 'react';
import type { TeamMember, TeamMemberUpdate, WeeklySchedule, DaySchedule } from '@/types/team';
import { teamService } from '@/lib/services/team-service';
import { UserRole } from '@/types/enums';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';

interface TeamMembersProps {
  teamId: string;
  onUpdate?: () => void;
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

export const TeamMembers = ({ teamId, onUpdate }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>(UserRole.AGENT);
  const [addingMemberLoading, setAddingMemberLoading] = useState(false);

  // Load team members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const teamMembers = await teamService.getTeamMembers(teamId);
        setMembers(teamMembers);
        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load team members');
        console.error('Failed to load team members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [teamId]);

  const handleAddMember = async () => {
    if (!newMemberId.trim()) {
      setError('Member ID is required');
      return;
    }

    setAddingMemberLoading(true);
    setError(null);

    try {
      const newMember: TeamMember = {
        teamId,
        userId: newMemberId,
        role: newMemberRole,
        schedule: defaultWeeklySchedule,
        skills: [],
        joinedAt: new Date(),
      };

      const success = await teamService.addTeamMember(newMember);

      if (success) {
        // Reload members list
        const updatedMembers = await teamService.getTeamMembers(teamId);
        setMembers(updatedMembers);
        setIsAddingMember(false);
        setNewMemberId('');
        setNewMemberRole(UserRole.AGENT);
        onUpdate?.();
      } else {
        setError('Failed to add team member');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to add team member');
    } finally {
      setAddingMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const success = await teamService.removeTeamMember(teamId, userId);
      if (success) {
        setMembers(members.filter(m => m.userId !== userId));
        onUpdate?.();
      } else {
        setError('Failed to remove team member');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to remove team member');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const update: TeamMemberUpdate = {
        teamId,
        userId,
        role: newRole,
      };
      const success = await teamService.updateTeamMember(update);
      if (success) {
        setMembers(members.map(m =>
          m.userId === userId ? { ...m, role: newRole } : m
        ));
        onUpdate?.();
      } else {
        setError('Failed to update member role');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to update member role');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Team Members</h2>
        <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  placeholder="Enter user ID"
                  disabled={addingMemberLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => setNewMemberRole(value as UserRole)}
                  disabled={addingMemberLoading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingMember(false)}
                  disabled={addingMemberLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={addingMemberLoading}
                >
                  {addingMemberLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isAddingMember && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.userId}>
              <TableCell>{member.userId}</TableCell>
              <TableCell>
                <Select
                  value={member.role}
                  onValueChange={(value) => handleRoleChange(member.userId, value as UserRole)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {member.skills?.map((skill) => (
                  <Badge key={skill} variant="secondary" className="mr-1">
                    {skill}
                  </Badge>
                ))}
              </TableCell>
              <TableCell>
                {new Date(member.joinedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove member</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 