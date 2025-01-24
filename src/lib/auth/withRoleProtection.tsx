import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase-client'
import type { ServerContext } from '@/lib/supabase-client'

export function withRoleProtection(allowedRoles: string[]) {
  return async function protectRoute(context: ServerContext) {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return redirect('/auth/signin')
      }

      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single()

      if (roleError || !roleData) {
        console.error('Error getting user role:', roleError)
        return redirect('/auth/signin')
      }

      // Get role details
      const { data: role, error: roleDetailsError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleData.role_id)
        .single()

      if (roleDetailsError || !role) {
        console.error('Error getting role details:', roleDetailsError)
        return redirect('/auth/signin')
      }

      if (!allowedRoles.includes(role.name)) {
        return redirect('/')
      }

      return null
    } catch (error) {
      console.error('Error in role protection:', error)
      return redirect('/auth/signin')
    }
  }
} 