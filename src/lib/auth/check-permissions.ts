import { getServerSupabase } from '@/lib/supabase-client'
import type { ServerContext } from '@/lib/supabase-client'
import { Permission } from '@/types/role';

interface PermissionCheckResult {
  error?: string;
  status?: number;
  user?: {
    id: string;
    type: 'customer' | 'agent';
  };
}

export async function checkUserPermissions(requiredPermission: Permission): Promise<PermissionCheckResult> {
  try {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return { error: 'Unauthorized', status: 401 };
    }

    // Get user's role and permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData) {
      console.error('Error getting user role:', roleError)
      return { error: 'Internal server error', status: 500 };
    }

    // Get role permissions
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleData.role_id)

    if (permError) {
      console.error('Error getting role permissions:', permError)
      return { error: 'Internal server error', status: 500 };
    }

    const userPermissions = permissions.map(p => p.permission)
    const hasPermission = userPermissions.includes(requiredPermission)

    if (!hasPermission) {
      return { error: 'Insufficient permissions', status: 403 };
    }

    return { user: { id: user.id, type: 'agent' } };
  } catch (error) {
    console.error('Error checking permissions:', error)
    return { error: 'Internal server error', status: 500 };
  }
}

export async function checkPermissions(
  context: ServerContext,
  requiredPermissions: string[]
): Promise<boolean> {
  try {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return false
    }

    // Get user's role and permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData) {
      console.error('Error getting user role:', roleError)
      return false
    }

    // Get role permissions
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleData.role_id)

    if (permError) {
      console.error('Error getting role permissions:', permError)
      return false
    }

    const userPermissions = permissions.map(p => p.permission)
    return requiredPermissions.every(p => userPermissions.includes(p))
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
} 