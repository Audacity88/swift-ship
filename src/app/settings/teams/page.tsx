'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeamList } from '@/components/features/teams/TeamList';
import { TeamForm } from '@/components/features/teams/TeamForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TeamsPage() {
  const router = useRouter();
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const handleCreateTeam = () => {
    setIsCreatingTeam(true);
  };

  const handleTeamCreated = (success: boolean) => {
    if (success) {
      setIsCreatingTeam(false);
      router.refresh();
    }
  };

  const handleViewMembers = (teamId: string) => {
    router.push(`/settings/teams/${teamId}/members`);
  };

  const handleViewSchedule = (teamId: string) => {
    router.push(`/settings/teams/${teamId}/schedule`);
  };

  const handleViewMetrics = (teamId: string) => {
    router.push(`/settings/teams/${teamId}/metrics`);
  };

  const handleEditTeam = (teamId: string) => {
    router.push(`/settings/teams/${teamId}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Teams</h1>
      </div>

      <TeamList
        onCreateTeam={handleCreateTeam}
        onEditTeam={handleEditTeam}
        onViewMembers={handleViewMembers}
        onViewSchedule={handleViewSchedule}
        onViewMetrics={handleViewMetrics}
      />

      <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <TeamForm
            onSubmit={handleTeamCreated}
            onCancel={() => setIsCreatingTeam(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 