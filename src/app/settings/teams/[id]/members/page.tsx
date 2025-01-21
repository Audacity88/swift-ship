'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TeamMembers } from '@/components/features/teams/TeamMembers';

interface TeamMembersPageProps {
  params: {
    id: string;
  };
}

export default function TeamMembersPage({ params }: TeamMembersPageProps) {
  const router = useRouter();

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Team Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Members</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMembers
            teamId={params.id}
            onUpdate={handleUpdate}
          />
        </CardContent>
      </Card>
    </div>
  );
} 