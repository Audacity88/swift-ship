import { createClient } from '@supabase/supabase-js';
import { Permission, RoleType, UserRoleData, RolePermissions, DEFAULT_ROLE_PERMISSIONS } from '@/types/role';
import { getAllPermissionsForRole } from '@/lib/auth/permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ROLES: RoleType[] = [RoleType.ADMIN, RoleType.AGENT, RoleType.SUPERVISOR, RoleType.CUSTOMER];

const rolePermissions: Record<RoleType, Permission[]> = {
  [RoleType.ADMIN]: Object.values(Permission),
  [RoleType.SUPERVISOR]: [
    Permission.VIEW_TEAMS,
    Permission.MANAGE_TEAMS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.MANAGE_TEAM_SCHEDULE,
    Permission.VIEW_TEAM_METRICS,
  ],
  [RoleType.AGENT]: [
    Permission.VIEW_TEAMS,
    Permission.VIEW_TEAM_METRICS,
  ],
  [RoleType.CUSTOMER]: [],
};

export function getUserPermissions(role: RoleType): Permission[] {
  return rolePermissions[role] || [];
}

export function hasPermission(role: RoleType, permission: Permission): boolean {
  const permissions = getUserPermissions(role);
  return permissions.includes(permission);
}

export function hasAnyPermission(role: RoleType, permissions: Permission[]): boolean {
  const userPermissions = getUserPermissions(role);
  return permissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(role: RoleType, permissions: Permission[]): boolean {
  const userPermissions = getUserPermissions(role);
  return permissions.every(permission => userPermissions.includes(permission));
}

export class RoleService {
  // Role CRUD Operations
  async getAllRoles(): Promise<RoleType[]> {
    return ROLES;
  }

  async getUserRole(userId: string): Promise<RoleType | null> {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data.role as RoleType;
  }

  async assignRole(roleData: UserRoleData): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        role: roleData.role,
        custom_permissions: roleData.customPermissions,
        role_assigned_by: roleData.assignedBy,
        role_assigned_at: roleData.assignedAt.toISOString(),
      })
      .eq('id', roleData.userId);

    return !error;
  }

  // Permission Management
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('users')
      .select('role, custom_permissions')
      .eq('id', userId)
      .single();

    if (error || !data) return [];

    // Return custom permissions if set, otherwise return default permissions for the role
    return (data.custom_permissions as Permission[]) || 
           DEFAULT_ROLE_PERMISSIONS[data.role as RoleType];
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  // Role Validation
  isValidRole(role: string): boolean {
    return ROLES.includes(role as RoleType);
  }

  isValidPermission(permission: string): boolean {
    return Object.values(Permission).includes(permission as Permission);
  }

  // Role Hierarchy Helpers
  canManageRole(managerRole: RoleType, targetRole: RoleType): boolean {
    const roleHierarchy: Record<RoleType, RoleType[]> = {
      [RoleType.ADMIN]: [RoleType.SUPERVISOR, RoleType.AGENT, RoleType.CUSTOMER],
      [RoleType.SUPERVISOR]: [RoleType.AGENT, RoleType.CUSTOMER],
      [RoleType.AGENT]: [RoleType.CUSTOMER],
      [RoleType.CUSTOMER]: [],
    };

    return roleHierarchy[managerRole]?.includes(targetRole) || false;
  }

  // Permission Set Helpers
  getDefaultPermissions(role: RoleType): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[role];
  }

  getRolesByPermission(permission: Permission): RoleType[] {
    return Object.entries(DEFAULT_ROLE_PERMISSIONS)
      .filter(([_, permissions]) => permissions.includes(permission))
      .map(([role]) => role as RoleType);
  }

  // Role Assignment Validation
  async validateRoleAssignment(
    assignerId: string,
    targetUserId: string,
    newRole: RoleType
  ): Promise<{ valid: boolean; error?: string }> {
    // Get assigner's role
    const assignerRole = await this.getUserRole(assignerId);
    if (!assignerRole) {
      return { valid: false, error: 'Assigner not found' };
    }

    // Get target user's current role
    const currentRole = await this.getUserRole(targetUserId);
    if (!currentRole) {
      return { valid: false, error: 'Target user not found' };
    }

    // Check if assigner can manage both current and new roles
    if (!this.canManageRole(assignerRole, currentRole) || 
        !this.canManageRole(assignerRole, newRole)) {
      return { 
        valid: false, 
        error: 'Insufficient permissions to manage this role' 
      };
    }

    return { valid: true };
  }

  // Permission Matrix Generation
  generatePermissionMatrix(): Record<RoleType, Record<Permission, boolean>> {
    const matrix: Record<RoleType, Record<Permission, boolean>> = {} as any;

    ROLES.forEach(role => {
      matrix[role] = {} as Record<Permission, boolean>;
      Object.values(Permission).forEach(permission => {
        matrix[role][permission] = DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
      });
    });

    return matrix;
  }
}

// Export singleton instance
export const roleService = new RoleService(); 