'use client';

import { useState } from 'react';
import { RoleType } from '@/types/role';
import { roleService } from '@/lib/services/role-service';
import { AGENT_ROLES } from '@/types/role';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface RoleAssignmentProps {
  userId?: string;
  initialRole?: RoleType;
  onAssign?: (success: boolean) => void;
}

export const RoleAssignment = ({
  userId,
  initialRole,
  onAssign,
}: RoleAssignmentProps) => {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(initialRole && AGENT_ROLES.includes(initialRole) ? initialRole : null);
  const [targetUserId, setTargetUserId] = useState(userId || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const availableRoles = AGENT_ROLES;

  const handleAssign = async () => {
    if (!selectedRole || !targetUserId) {
      setError('Please select a role and enter a user ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await roleService.assignRole(undefined, targetUserId, selectedRole);
      onAssign?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onAssign?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Change the role of an existing agent. Customer accounts cannot be promoted through this form.</p>
      <div className="space-y-2">
        <Label htmlFor="userId">Existing agent ID</Label>
        <Input
          id="userId"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Enter an existing agent ID"
          disabled={isLoading || !!userId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={selectedRole || undefined}
          onValueChange={(value) => setSelectedRole(value as RoleType)}
          disabled={isLoading}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => (
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

      <Button
        onClick={handleAssign}
        disabled={isLoading || !selectedRole || !targetUserId}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Assigning Role...
          </>
        ) : (
          'Assign Role'
        )}
      </Button>
    </div>
  );
}; 