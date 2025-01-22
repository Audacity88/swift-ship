import { roleService } from '@/lib/services'
import { createClient } from '@supabase/supabase-js';
import { RoleType, Permission } from '@/types/role'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cache interface
interface PermissionCache {
  permissions: Permission[];
  role: RoleType;
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

function cachePermissions(userId: string, permissions: Permission[], role: RoleType) {
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

export async function getUserPermissions(): Promise<Permission[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return [];
  }

  // Check cache first
  const cachedPermissions = getCachedPermissions(session.user.id);
  if (cachedPermissions) {
    return cachedPermissions;
  }

  // Check if user is an agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('id', session.user.id)
    .single();

  if (agent) {
    const permissions = await roleService.getPermissionsForRole(agent.role as RoleType);
    if (permissions) {
      cachePermissions(session.user.id, permissions, agent.role as RoleType);
      return permissions;
    }
    return [];
  }

  // If not an agent, check if user is a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (customer) {
    const permissions = await roleService.getPermissionsForRole(RoleType.CUSTOMER);
    if (permissions) {
      cachePermissions(session.user.id, permissions, RoleType.CUSTOMER);
      return permissions;
    }
  }

  return [];
}

export async function hasPermission(requiredPermission: Permission): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions.includes(requiredPermission);
}

export async function hasAnyPermission(requiredPermissions: Permission[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return requiredPermissions.some(permission => permissions.includes(permission));
}

export async function hasAllPermissions(requiredPermissions: Permission[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return requiredPermissions.every(permission => permissions.includes(permission));
}

export async function getUserRole(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  // Check cache first
  const cached = permissionCache.get(session.user.id);
  if (cached) {
    return {
      role: cached.role,
      type: cached.role === 'customer' ? 'customer' : 'agent'
    };
  }

  // Check if user is an agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('id', session.user.id)
    .single();

  if (agent) {
    const permissions = await roleService.getPermissionsForRole(agent.role as RoleType);
    if (permissions) {
      cachePermissions(session.user.id, permissions, agent.role as RoleType);
      return {
        role: agent.role,
        type: 'agent'
      };
    }
  }

  // If not an agent, check if user is a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (customer) {
    const permissions = await roleService.getPermissionsForRole(RoleType.CUSTOMER);
    if (permissions) {
      cachePermissions(session.user.id, permissions, RoleType.CUSTOMER);
      return {
        role: 'customer',
        type: 'customer'
      };
    }
  }

  return null;
}

// Role hierarchy definition
const ROLE_HIERARCHY: Record<RoleType, RoleType[]> = {
  [RoleType.ADMIN]: [RoleType.SUPERVISOR, RoleType.AGENT],
  [RoleType.SUPERVISOR]: [RoleType.AGENT],
  [RoleType.AGENT]: [],
  [RoleType.CUSTOMER]: [],
};

// Get all permissions for a role including inherited ones
export async function getAllPermissionsForRole(role: RoleType): Promise<Permission[]> {
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
  if (user.role === RoleType.ADMIN) {
    return true;
  }

  // For non-admin users, check specific permissions
  const requiredPermissions = getPermissionsForRoute(pathname);
  if (requiredPermissions.length === 0) {
    // If no specific permissions are required, allow access
    return true;
  }

  return hasAnyPermission(requiredPermissions);
}

// Clear cache for a user (useful for testing and role updates)
export function clearPermissionCache(userId: string) {
  permissionCache.delete(userId);
}

// Clear entire cache (useful for testing)
export function clearAllPermissionCaches() {
  permissionCache.clear();
} 