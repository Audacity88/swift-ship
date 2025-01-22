'use client';;
import { use } from "react";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TeamMetrics } from '@/components/features/teams/TeamMetrics';

interface TeamMetricsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TeamMetricsPage(props: TeamMetricsPageProps) {
  const params = use(props.params);
  const router = useRouter();

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
        <h1 className="text-3xl font-bold">Team Performance</h1>
      </div>

      <TeamMetrics teamId={params.id} />
    </div>
  );
} 