import { roleService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'
import type { ServerContext } from '@/lib/supabase-client'
import type { Permission } from '@/types/role'

// Cache interface
interface PermissionCache {
  permissions: Permission[];
  role: string;
  timestamp: number;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// In-memory cache
const permissionCache = new Map<string, PermissionCache>();

function getCachedPermissions(userId: string): Permission[] | null {
  const cached = permissionCache.get(userId);
  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    permissionCache.delete(userId);
    return null;
  }

  return cached.permissions;
}

function cachePermissions(userId: string, permissions: Permission[], role: string) {
  permissionCache.set(userId, {
    permissions,
    role,
    timestamp: Date.now(),
  });
}

interface AuthUser {
  role: string;
  type: 'agent' | 'customer';
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const supabase = getServerSupabase()
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        role,
        role_id(
          permissions:role_permissions(
            permission_id(*)
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (agentError) {
      console.error('Error fetching agent permissions:', agentError)
      return []
    }

    if (!agent) {
      return []
    }

    // Extract permissions from role
    const permissions = agent.role_id?.permissions?.map(p => p.permission_id.name) || []

    // Add admin permissions if user is admin
    if (agent.role === 'admin') {
      permissions.push(...Object.values(Permission))
    }

    return permissions
  } catch (error) {
    console.error('Error in getUserPermissions:', error)
    return []
  }
}

export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId)
    return permissions.includes(permission)
  } catch (error) {
    console.error('Error in hasPermission:', error)
    return false
  }
}

export async function hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId)
    return permissions.some(p => userPermissions.includes(p))
  } catch (error) {
    console.error('Error in hasAnyPermission:', error)
    return false
  }
}

export async function hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId)
    return permissions.every(p => userPermissions.includes(p))
  } catch (error) {
    console.error('Error in hasAllPermissions:', error)
    return false
  }
}

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = getServerSupabase()
    const { data: agent, error } = await supabase
      .from('agents')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    return agent?.role || null
  } catch (error) {
    console.error('Error in getUserRole:', error)
    return null
  }
}

// Role hierarchy definition
const ROLE_HIERARCHY: Record<string, string[]> = {
  'admin': ['supervisor', 'agent'],
  'supervisor': ['agent'],
  'agent': [],
  'customer': [],
};

// Get all permissions for a role including inherited ones
export async function getAllPermissionsForRole(role: string): Promise<Permission[]> {
  const basePermissions = await roleService.getPermissionsForRole(role);
  const inheritedRoles = ROLE_HIERARCHY[role] || [];
  
  const inheritedPermissionsPromises = inheritedRoles.map(inheritedRole => 
    roleService.getPermissionsForRole(inheritedRole)
  );

  const inheritedPermissions = await Promise.all(inheritedPermissionsPromises);
  const allPermissions = [...(basePermissions || []), ...inheritedPermissions.flat()];

  // Remove duplicates
  return [...new Set(allPermissions)];
}

// Add this before isAuthorizedForRoute
function getPermissionsForRoute(pathname: string): Permission[] {
  // Define route permission mappings
  const routePermissions: Record<string, Permission[]> = {
    // Admin routes
    '/settings/roles': [Permission.MANAGE_ROLES],
    '/settings/roles/assign': [Permission.MANAGE_ROLES],
    '/settings/teams': [Permission.VIEW_TEAMS],
    '/settings/teams/new': [Permission.MANAGE_TEAMS],
    '/settings/users': [Permission.MANAGE_USERS],
    '/admin': [Permission.MANAGE_SETTINGS],
    
    // Agent routes
    '/inbox': [Permission.VIEW_TICKETS],
    '/tickets': [Permission.VIEW_TICKETS],
    '/analytics': [Permission.VIEW_ANALYTICS],
    '/knowledge': [Permission.VIEW_KNOWLEDGE_BASE],
    
    // Customer routes
    '/portal/tickets/new': [Permission.CREATE_OWN_TICKETS],
    '/portal/knowledge/articles': [Permission.VIEW_PUBLIC_ARTICLES],
  };

  // Handle portal ticket routes (for customers)
  if (pathname.startsWith('/portal/tickets/')) {
    if (pathname.endsWith('/new')) {
      return [Permission.CREATE_OWN_TICKETS];
    }
    // No longer allow viewing ticket details
    return [];
  }

  // Handle agent ticket routes
  if (pathname.startsWith('/tickets/')) {
    return [Permission.VIEW_TICKETS];
  }

  // Handle dynamic routes
  if (pathname.startsWith('/settings/teams/')) {
    if (pathname.includes('/members')) {
      return [Permission.MANAGE_TEAM_MEMBERS];
    }
    if (pathname.includes('/schedule')) {
      return [Permission.MANAGE_TEAM_SCHEDULE];
    }
    if (pathname.includes('/metrics')) {
      return [Permission.VIEW_TEAM_METRICS];
    }
    return [Permission.MANAGE_TEAMS];
  }

  // Handle dynamic knowledge base routes
  if (pathname.startsWith('/knowledge/')) {
    if (pathname.includes('/edit') || pathname.includes('/new')) {
      return [Permission.MANAGE_KNOWLEDGE_BASE];
    }
    return [Permission.VIEW_KNOWLEDGE_BASE];
  }

  return routePermissions[pathname] || [];
}

export async function isAuthorizedForRoute(pathname: string): Promise<boolean> {
  const user = await getUserRole();
  
  if (!user) {
    return false;
  }

  // Admin has access to everything
  if (user === 'admin') {
    return true;
  }

  // For non-admin users, check specific permissions
  const requiredPermissions = getPermissionsForRoute(pathname);
  if (requiredPermissions.length === 0) {
    // If no specific permissions are required, allow access
    return true;
  }

  return hasAnyPermission(user, requiredPermissions);
}

// Clear cache for a user (useful for testing and role updates)
export function clearPermissionCache(userId: string) {
  permissionCache.delete(userId);
}

// Clear entire cache (useful for testing)
export function clearAllPermissionCaches() {
  permissionCache.clear();
} 