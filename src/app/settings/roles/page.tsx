'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/role';
import { RoleList } from '@/components/features/roles/RoleList';
import { PermissionMatrix } from '@/components/features/roles/PermissionMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function RolesPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined);

  const handleAssignRole = (role: UserRole) => {
    router.push(`/settings/roles/assign?role=${role}`);
  };

  const handleViewPermissions = (role: UserRole) => {
    setSelectedRole(role);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Role Management</h1>
        <Button
          onClick={() => router.push('/settings/roles/assign')}
        >
          Assign Role
        </Button>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleList
              onAssignRole={handleAssignRole}
              onViewPermissions={handleViewPermissions}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {selectedRole ? `${selectedRole} Permissions` : 'Permissions Matrix'}
            </CardTitle>
            {selectedRole && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRole(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <PermissionMatrix
              selectedRole={selectedRole}
              readOnly={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 