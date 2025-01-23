import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Role, Permission } from '@/types/role'

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

  async assignRole(context: ServerContext, userId: string, roleId: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: roleId,
          assigned_by: user.id,
          assigned_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to assign role:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in assignRole:', error)
      throw error
    }
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