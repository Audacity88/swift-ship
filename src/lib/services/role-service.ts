import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Role, Permission } from '@/types/role'

export const roleService = {
  async getRoles(context: ServerContext): Promise<Role[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: roles, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          permissions,
          created_at,
          updated_at,
          created_by,
          updated_by
        `)
        .order('name')

      if (error) {
        console.error('Failed to get roles:', error)
        throw error
      }

      return roles || []
    } catch (error) {
      console.error('Error in getRoles:', error)
      throw error
    }
  },

  async getRole(context: ServerContext, roleId: string): Promise<Role | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: role, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          permissions,
          created_at,
          updated_at,
          created_by,
          updated_by
        `)
        .eq('id', roleId)
        .single()

      if (error) {
        console.error('Failed to get role:', error)
        throw error
      }

      return role
    } catch (error) {
      console.error('Error in getRole:', error)
      throw error
    }
  },

  async createRole(context: ServerContext, data: { name: string; description?: string; permissions: Permission[] }): Promise<Role> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: role, error } = await supabase
        .from('roles')
        .insert({
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          created_by: session.user.id,
          updated_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create role:', error)
        throw error
      }

      return role
    } catch (error) {
      console.error('Error in createRole:', error)
      throw error
    }
  },

  async updateRole(context: ServerContext, roleId: string, data: { name?: string; description?: string; permissions?: Permission[] }): Promise<Role> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: role, error } = await supabase
        .from('roles')
        .update({
          ...data,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update role:', error)
        throw error
      }

      return role
    } catch (error) {
      console.error('Error in updateRole:', error)
      throw error
    }
  },

  async deleteRole(context: ServerContext, roleId: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // First check if role is in use
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)

      if (countError) {
        console.error('Failed to check role usage:', countError)
        throw countError
      }

      if (count && count > 0) {
        throw new Error('Cannot delete role that is still assigned to users')
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: session.user.id,
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

  async removeRole(context: ServerContext, userId: string, roleId: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)

      if (error) {
        console.error('Failed to remove role:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in removeRole:', error)
      throw error
    }
  }
}