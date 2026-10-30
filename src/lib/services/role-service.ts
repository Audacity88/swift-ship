import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Permission } from '@/types/role'
import { AGENT_ROLES, RoleType } from '@/types/role'

export interface Role {
  id: string
  name: string
  description?: string
  permissions?: Permission[]
  is_system?: boolean
  created_at?: string
  updated_at?: string
}

export const roleService = {
  async listRoles(context: ServerContext): Promise<Role[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) {
        console.error('Failed to list roles:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in listRoles:', error)
      throw error
    }
  },

  async getRole(context: ServerContext, roleId: string): Promise<Role | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error) {
        console.error('Failed to get role:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getRole:', error)
      throw error
    }
  },

  async createRole(context: ServerContext, role: Partial<Role>): Promise<Role> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('roles')
        .insert({
          ...role,
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create role:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createRole:', error)
      throw error
    }
  },

  async updateRole(context: ServerContext, roleId: string, updates: Partial<Role>): Promise<Role> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('roles')
        .update({
          ...updates,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update role:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateRole:', error)
      throw error
    }
  },

  async deleteRole(context: ServerContext, roleId: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Check if role is in use
      const { data: usersWithRole, error: userCheckError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', roleId)
        .limit(1)

      if (userCheckError) {
        console.error('Failed to check role usage:', userCheckError)
        throw userCheckError
      }

      if (usersWithRole?.length) {
        throw new Error('Cannot delete role that is assigned to users')
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) {
        console.error('Failed to delete role:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteRole:', error)
      throw error
    }
  },

  async assignRole(context: ServerContext, userId: string, role: RoleType): Promise<void> {
    if (!AGENT_ROLES.includes(role)) throw new Error('Select a valid staff role')
    const supabase = getServerSupabase(context)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')
    const { data: actor, error: actorError } = await supabase.from('agents')
      .select('role').eq('id', user.id).maybeSingle()
    if (actorError || actor?.role !== RoleType.ADMIN) throw new Error('Admin access required')

    // Updating an existing row cannot turn a customer into a staff member.
    // RLS independently restricts this write to admins.
    const { data: agent, error } = await supabase.from('agents')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId).select('id').maybeSingle()
    if (error) throw error
    if (!agent) throw new Error('Agent not found. Use the agent creation workflow for new staff.')
  },

  async getRolePermissions(context: ServerContext, roleId: string): Promise<Permission[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role_id', roleId)

      if (error) {
        console.error('Failed to get role permissions:', error)
        throw error
      }

      return data.map(p => p.permission)
    } catch (error) {
      console.error('Error in getRolePermissions:', error)
      throw error
    }
  }
}