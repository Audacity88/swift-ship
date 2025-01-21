'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@/types/role';
import { roleService } from '@/lib/services/role-service';
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
  initialRole?: UserRole;
  onAssign?: (success: boolean) => void;
}

export const RoleAssignment = ({
  userId,
  initialRole,
  onAssign,
}: RoleAssignmentProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole || null);
  const [targetUserId, setTargetUserId] = useState(userId || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  // Load available roles on mount
  useEffect(() => {
    const loadRoles = async () => {
      const roles = await roleService.getAllRoles();
      setAvailableRoles(roles);
    };
    loadRoles();
  }, []);

  const handleAssign = async () => {
    if (!selectedRole || !targetUserId) {
      setError('Please select a role and enter a user ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await roleService.assignRole({
        userId: targetUserId,
        role: selectedRole,
        assignedBy: 'current-user', // TODO: Get from auth context
        assignedAt: new Date(),
        customPermissions: undefined,
      });

      if (success) {
        onAssign?.(true);
      } else {
        setError('Failed to assign role. Please try again.');
        onAssign?.(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onAssign?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="userId">User ID</Label>
        <Input
          id="userId"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Enter user ID"
          disabled={isLoading || !!userId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={selectedRole || undefined}
          onValueChange={(value) => setSelectedRole(value as UserRole)}
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