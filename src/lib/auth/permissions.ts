import { isAgentRole, Permission, RoleType } from '@/types/role';
import { createClient } from '@supabase/supabase-js';
import { roleService } from '@/lib/services/role-service';

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
    const permissions = await roleService.getUserPermissions(agent.role as RoleType);
    cachePermissions(session.user.id, permissions, agent.role as RoleType);
    return permissions;
  }

  // If not an agent, check if user is a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (customer) {
    const permissions = await roleService.getUserPermissions(RoleType.CUSTOMER);
    cachePermissions(session.user.id, permissions, RoleType.CUSTOMER);
    return permissions;
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
    const permissions = await roleService.getUserPermissions(agent.role as RoleType);
    cachePermissions(session.user.id, permissions, agent.role as RoleType);
    return {
      role: agent.role,
      type: 'agent'
    };
  }

  // If not an agent, check if user is a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (customer) {
    const permissions = await roleService.getUserPermissions(RoleType.CUSTOMER);
    cachePermissions(session.user.id, permissions, RoleType.CUSTOMER);
    return {
      role: 'customer',
      type: 'customer'
    };
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
export function getAllPermissionsForRole(role: RoleType): Permission[] {
  const basePermissions = roleService.getDefaultPermissions(role);
  const inheritedRoles = ROLE_HIERARCHY[role] || [];
  
  const inheritedPermissions = inheritedRoles.flatMap(inheritedRole => 
    roleService.getDefaultPermissions(inheritedRole)
  );

  // Remove duplicates
  return [...new Set([...basePermissions, ...inheritedPermissions])];
}

export async function isAuthorizedForRoute(pathname: string): Promise<boolean> {
  const user = await getUserRole();
  
  if (!user) {
    return false;
  }

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
    '/shipments': [Permission.VIEW_TICKETS],
    '/pickup': [Permission.VIEW_TICKETS],
    '/teams': [Permission.VIEW_TEAMS],
    '/knowledge': [Permission.VIEW_KNOWLEDGE_BASE],
    
    // Customer routes
    '/portal/tickets/new': [Permission.CREATE_OWN_TICKETS],
    '/portal/knowledge/articles': [Permission.VIEW_PUBLIC_ARTICLES],
  };

  // Admin has access to everything
  if (user.role === RoleType.ADMIN) {
    return true;
  }

  // Check if the route is an admin route
  if (pathname.startsWith('/settings/') || pathname.startsWith('/admin/')) {
    // Only ADMIN role can access admin routes
    return user.role === RoleType.ADMIN;
  }

  // Check if the route is an agent route
  if (
    pathname === '/inbox' ||
    pathname.startsWith('/inbox/') ||
    pathname === '/tickets' ||
    pathname.startsWith('/tickets/') ||
    pathname === '/analytics' ||
    pathname.startsWith('/analytics/') ||
    pathname === '/shipments' ||
    pathname.startsWith('/shipments/') ||
    pathname === '/pickup' ||
    pathname.startsWith('/pickup/') ||
    pathname === '/teams' ||
    pathname.startsWith('/teams/') ||
    pathname === '/knowledge' ||
    pathname.startsWith('/knowledge/')
  ) {
    // Admin and agent roles can access agent routes
    return user.role === RoleType.ADMIN || user.type === 'agent';
  }

  // Handle dynamic routes
  if (pathname === '/settings/teams' || pathname.startsWith('/settings/teams/')) {
    if (pathname.includes('/members')) {
      return hasPermission(Permission.MANAGE_TEAM_MEMBERS);
    }
    if (pathname.includes('/schedule')) {
      return hasPermission(Permission.MANAGE_TEAM_SCHEDULE);
    }
    if (pathname.includes('/metrics')) {
      return hasPermission(Permission.VIEW_TEAM_METRICS);
    }
    return hasPermission(Permission.MANAGE_TEAMS);
  }

  // Handle dynamic ticket routes
  if (pathname === '/tickets' || pathname.startsWith('/tickets/')) {
    return hasPermission(Permission.VIEW_TICKETS);
  }

  // Handle dynamic portal ticket routes
  if (pathname.startsWith('/portal/tickets/')) {
    const ticketId = pathname.split('/')[3];
    if (ticketId === 'new') {
      return hasPermission(Permission.CREATE_OWN_TICKETS);
    }
    return hasPermission(Permission.VIEW_OWN_TICKETS);
  }

  // Handle dynamic knowledge base routes
  if (pathname.startsWith('/knowledge/')) {
    if (pathname.includes('/edit') || pathname.includes('/new')) {
      return hasPermission(Permission.MANAGE_KNOWLEDGE_BASE);
    }
    return hasPermission(Permission.VIEW_KNOWLEDGE_BASE);
  }

  // Handle dynamic portal knowledge base routes
  if (pathname.startsWith('/portal/knowledge/articles/')) {
    return hasPermission(Permission.VIEW_PUBLIC_ARTICLES);
  }

  const requiredPermissions = routePermissions[pathname];
  if (!requiredPermissions) {
    return true; // Allow access to routes without specific permissions
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