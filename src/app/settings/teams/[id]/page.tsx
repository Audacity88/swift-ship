'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TeamForm } from '@/components/features/teams/TeamForm';

interface TeamPageProps {
  params: {
    id: string;
  };
}

export default function TeamPage({ params }: TeamPageProps) {
  const router = useRouter();

  const handleTeamUpdated = (success: boolean) => {
    if (success) {
      router.push('/settings/teams');
      router.refresh();
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Team</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamForm
            teamId={params.id}
            onSubmit={handleTeamUpdated}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
} 