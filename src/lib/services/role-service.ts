import { supabase } from '@/lib/supabase'
import { RoleType, Permission } from '@/types/role'

export const roleService = {
  async getAllRoles(): Promise<Array<{ role: RoleType; permissions: Permission[] }>> {
    // Suppose we store roles in a "roles" or "agents" table. For now, let's just return defaults from the code.
    return [
      { role: RoleType.ADMIN, permissions: Object.values(Permission) },
      { role: RoleType.SUPERVISOR, permissions: [
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
        ]
      },
      { role: RoleType.AGENT, permissions: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.UPDATE_TICKETS,
          Permission.VIEW_TEAMS,
          Permission.VIEW_ANALYTICS,
        ]
      },
      { role: RoleType.CUSTOMER, permissions: [
          Permission.VIEW_OWN_TICKETS,
          Permission.CREATE_OWN_TICKETS,
          Permission.COMMENT_OWN_TICKETS,
          Permission.VIEW_PUBLIC_ARTICLES,
          Permission.RATE_ARTICLES,
          Permission.MANAGE_OWN_PROFILE,
        ]
      },
    ]
  },

  async assignRole(userId: string, role: RoleType): Promise<boolean> {
    // If we store roles in 'agents' or a separate table
    const { error } = await supabase
      .from('agents')
      .update({
        role
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to assign role:', error)
      return false
    }
    return true
  },

  async removeRole(userId: string): Promise<boolean> {
    // Possibly revert them to 'customer'?
    const { error } = await supabase
      .from('agents')
      .update({
        role: RoleType.CUSTOMER
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to remove role:', error)
      return false
    }
    return true
  },

  async getPermissionsForRole(role: RoleType): Promise<Permission[]> {
    const roles = await this.getAllRoles()
    const found = roles.find(r => r.role === role)
    return found ? found.permissions : []
  },
}