export enum RoleType {
  ADMIN = 'admin',
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  CUSTOMER = 'customer'
}

export type UserRole = RoleType

export const USER_ROLE_LABELS: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'Administrator',
  [RoleType.AGENT]: 'Support Agent',
  [RoleType.SUPERVISOR]: 'Team Supervisor',
  [RoleType.CUSTOMER]: 'Customer'
}

export const AGENT_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.AGENT, RoleType.SUPERVISOR]

export function isAgentRole(role: RoleType): boolean {
  return AGENT_ROLES.includes(role)
}

export function getRoleLabel(role: RoleType): string {
  return USER_ROLE_LABELS[role] || role
}

export enum Permission {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  
  // Role Management
  VIEW_ROLES = 'VIEW_ROLES',
  MANAGE_ROLES = 'MANAGE_ROLES',
  
  // Team Management
  VIEW_TEAMS = 'VIEW_TEAMS',
  MANAGE_TEAMS = 'MANAGE_TEAMS',
  MANAGE_TEAM_MEMBERS = 'MANAGE_TEAM_MEMBERS',
  MANAGE_TEAM_SCHEDULE = 'MANAGE_TEAM_SCHEDULE',
  VIEW_TEAM_METRICS = 'VIEW_TEAM_METRICS',
  
  // Ticket Management
  VIEW_TICKETS = 'VIEW_TICKETS',
  MANAGE_TICKETS = 'MANAGE_TICKETS',
  ASSIGN_TICKETS = 'ASSIGN_TICKETS',
  CREATE_TICKETS = 'CREATE_TICKETS',
  EDIT_TICKETS = 'EDIT_TICKETS',
  
  // Knowledge Base Management
  VIEW_KNOWLEDGE_BASE = 'VIEW_KNOWLEDGE_BASE',
  MANAGE_KNOWLEDGE_BASE = 'MANAGE_KNOWLEDGE_BASE',
  
  // Customer Portal Management
  VIEW_PORTAL = 'VIEW_PORTAL',
  MANAGE_PORTAL = 'MANAGE_PORTAL',
  
  // System Settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  
  // Analytics
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_ANALYTICS = 'MANAGE_ANALYTICS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  
  // Customer Permissions
  VIEW_OWN_TICKETS = 'VIEW_OWN_TICKETS',
  CREATE_OWN_TICKETS = 'CREATE_OWN_TICKETS',
  COMMENT_OWN_TICKETS = 'COMMENT_OWN_TICKETS',
  VIEW_PUBLIC_ARTICLES = 'VIEW_PUBLIC_ARTICLES',
  RATE_ARTICLES = 'RATE_ARTICLES',
  MANAGE_OWN_PROFILE = 'MANAGE_OWN_PROFILE',
}

export interface RolePermissions {
  role: RoleType;
  permissions: Permission[];
}

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  [RoleType.ADMIN]: Object.values(Permission),
  [RoleType.SUPERVISOR]: [
    Permission.VIEW_ROLES,
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VIEW_TEAMS,
    Permission.MANAGE_TEAM_SCHEDULE,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_REPORTS,
  ],
  [RoleType.AGENT]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.VIEW_TEAMS,
    Permission.VIEW_ANALYTICS,
  ],
  [RoleType.CUSTOMER]: [
    Permission.VIEW_OWN_TICKETS,
    Permission.CREATE_OWN_TICKETS,
    Permission.COMMENT_OWN_TICKETS,
    Permission.VIEW_PUBLIC_ARTICLES,
    Permission.RATE_ARTICLES,
    Permission.MANAGE_OWN_PROFILE,
  ],
}

export interface UserRoleData {
  userId: string;
  role: RoleType;
  customPermissions?: Permission[]; // Optional override of default permissions
  assignedBy: string;
  assignedAt: Date;
} 