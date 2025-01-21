'use client';

import { useEffect, useState } from 'react';
import { RoleType, Permission } from '@/types/role';
import { roleService } from '@/lib/services/role-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionMatrixProps {
  selectedRole?: RoleType;
  readOnly?: boolean;
  onPermissionsChange?: (permissions: Permission[]) => void;
}

export const PermissionMatrix = ({
  selectedRole,
  readOnly = true,
  onPermissionsChange,
}: PermissionMatrixProps) => {
  const [matrix, setMatrix] = useState<Record<RoleType, Record<Permission, boolean>>>(() => {
    const emptyMatrix: Record<RoleType, Record<Permission, boolean>> = Object.values(RoleType).reduce(
      (acc, role) => ({
        ...acc,
        [role]: Object.values(Permission).reduce(
          (perms, perm) => ({ ...perms, [perm]: false }),
          {} as Record<Permission, boolean>
        ),
      }),
      {} as Record<RoleType, Record<Permission, boolean>>
    );
    return emptyMatrix;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatrix = async () => {
      const permissionMatrix = roleService.generatePermissionMatrix();
      setMatrix(permissionMatrix);
      setLoading(false);
    };
    loadMatrix();
  }, []);

  const handlePermissionToggle = (role: RoleType, permission: Permission) => {
    if (readOnly || role !== selectedRole) return;

    setMatrix((prev) => {
      const newMatrix = { ...prev };
      newMatrix[role] = {
        ...newMatrix[role],
        [permission]: !newMatrix[role][permission],
      };

      // Notify parent of changes for the selected role
      if (role === selectedRole) {
        const activePermissions = Object.entries(newMatrix[role])
          .filter(([_, isActive]) => isActive)
          .map(([perm]) => perm as Permission);
        onPermissionsChange?.(activePermissions);
      }

      return newMatrix;
    });
  };

  const getPermissionDescription = (permission: Permission): string => {
    const descriptions: Record<Permission, string> = {
      [Permission.VIEW_USERS]: 'Can view user profiles',
      [Permission.MANAGE_USERS]: 'Can manage user accounts',
      [Permission.VIEW_ROLES]: 'Can view role assignments',
      [Permission.MANAGE_ROLES]: 'Can manage roles and permissions',
      [Permission.VIEW_TEAMS]: 'Can view team information',
      [Permission.MANAGE_TEAMS]: 'Can manage teams',
      [Permission.MANAGE_TEAM_MEMBERS]: 'Can manage team members',
      [Permission.MANAGE_TEAM_SCHEDULE]: 'Can manage team schedules',
      [Permission.VIEW_TEAM_METRICS]: 'Can view team metrics',
      [Permission.VIEW_TICKETS]: 'Can view support tickets',
      [Permission.MANAGE_TICKETS]: 'Can manage tickets',
      [Permission.ASSIGN_TICKETS]: 'Can assign tickets',
      [Permission.CREATE_TICKETS]: 'Can create tickets',
      [Permission.EDIT_TICKETS]: 'Can edit tickets',
      [Permission.VIEW_KNOWLEDGE_BASE]: 'Can view knowledge base',
      [Permission.MANAGE_KNOWLEDGE_BASE]: 'Can manage knowledge base',
      [Permission.VIEW_PORTAL]: 'Can view customer portal',
      [Permission.MANAGE_PORTAL]: 'Can manage customer portal',
      [Permission.VIEW_SETTINGS]: 'Can view system settings',
      [Permission.MANAGE_SETTINGS]: 'Can manage system settings',
      [Permission.VIEW_ANALYTICS]: 'Can view analytics',
      [Permission.MANAGE_ANALYTICS]: 'Can manage analytics',
      [Permission.EXPORT_REPORTS]: 'Can export reports',
      // Customer-specific permissions
      [Permission.VIEW_OWN_TICKETS]: 'Can view own tickets',
      [Permission.CREATE_OWN_TICKETS]: 'Can create own tickets',
      [Permission.COMMENT_OWN_TICKETS]: 'Can comment on own tickets',
      [Permission.VIEW_PUBLIC_ARTICLES]: 'Can view public articles',
      [Permission.RATE_ARTICLES]: 'Can rate and provide feedback on articles',
      [Permission.MANAGE_OWN_PROFILE]: 'Can manage own profile settings',
    };
    return descriptions[permission] || permission;
  };

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Permission</TableHead>
            {Object.values(RoleType).map((role) => (
              <TableHead key={role} className="text-center">
                {role}
                {role === selectedRole && !readOnly && (
                  <Badge className="ml-2" variant="outline">
                    Editing
                  </Badge>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(Permission).map((permission) => (
            <TableRow key={permission}>
              <TableCell className="font-medium">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2">
                      {permission}
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getPermissionDescription(permission)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              {Object.values(RoleType).map((role) => (
                <TableCell key={role} className="text-center">
                  <Checkbox
                    checked={matrix[role]?.[permission] || false}
                    onCheckedChange={() => handlePermissionToggle(role, permission)}
                    disabled={readOnly || role !== selectedRole}
                    aria-label={`${permission} permission for ${role} role`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 