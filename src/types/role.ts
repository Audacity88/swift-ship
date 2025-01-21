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
  VIEW_USERS = 'view_users',
  MANAGE_USERS = 'manage_users',
  
  // Role Management
  VIEW_ROLES = 'view_roles',
  MANAGE_ROLES = 'manage_roles',
  
  // Team Management
  VIEW_TEAMS = 'view_teams',
  MANAGE_TEAMS = 'manage_teams',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',
  MANAGE_TEAM_SCHEDULE = 'manage_team_schedule',
  VIEW_TEAM_METRICS = 'view_team_metrics',
  
  // Ticket Management
  VIEW_TICKETS = 'view_tickets',
  MANAGE_TICKETS = 'manage_tickets',
  ASSIGN_TICKETS = 'assign_tickets',
  CREATE_TICKETS = 'create_tickets',
  UPDATE_TICKETS = 'update_tickets',
  DELETE_TICKETS = 'delete_tickets',
  CREATE_COMMENTS = 'create_comments',
  
  // Knowledge Base Management
  VIEW_KNOWLEDGE_BASE = 'view_knowledge_base',
  MANAGE_KNOWLEDGE_BASE = 'manage_knowledge_base',
  
  // Customer Portal Management
  VIEW_PORTAL = 'view_portal',
  MANAGE_PORTAL = 'manage_portal',
  
  // System Settings
  VIEW_SETTINGS = 'view_settings',
  MANAGE_SETTINGS = 'manage_settings',
  
  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_ANALYTICS = 'manage_analytics',
  EXPORT_REPORTS = 'export_reports',
  
  // Customer Permissions
  VIEW_OWN_TICKETS = 'view_own_tickets',
  CREATE_OWN_TICKETS = 'create_own_tickets',
  COMMENT_OWN_TICKETS = 'comment_own_tickets',
  VIEW_PUBLIC_ARTICLES = 'view_public_articles',
  RATE_ARTICLES = 'rate_articles',
  MANAGE_OWN_PROFILE = 'manage_own_profile',
  
  // Profile Permissions
  VIEW_PROFILE = 'view_profile',
  UPDATE_PROFILE = 'update_profile'
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
    Permission.UPDATE_TICKETS,
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
    Permission.UPDATE_TICKETS,
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