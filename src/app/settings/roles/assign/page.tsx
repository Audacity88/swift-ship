'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RoleType } from '@/types/role';
import { RoleAssignment } from '@/components/features/roles/RoleAssignment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AssignRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams?.get('role');
  const initialRole = roleParam as RoleType | undefined;

  const handleAssignmentComplete = (success: boolean) => {
    if (success) {
      router.push('/settings/roles');
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
        <h1 className="text-3xl font-bold">Assign Role</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleAssignment
            initialRole={initialRole}
            onAssign={handleAssignmentComplete}
          />
        </CardContent>
      </Card>
    </div>
  );
} 