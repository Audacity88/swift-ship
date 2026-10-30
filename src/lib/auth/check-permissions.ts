import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ROLE_PERMISSIONS, Permission, RoleType } from '@/types/role'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PermissionCheckResult {
  error?: string
  status?: number
  user?: { id: string; type: 'customer' | 'agent' }
}

async function currentPermissions(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: agent, error: roleError } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
  if (roleError) return null
  const role = agent?.role || RoleType.CUSTOMER
  const permissions = DEFAULT_ROLE_PERMISSIONS[role as RoleType]
  if (!permissions) return null
  return { user, permissions, type: agent ? 'agent' as const : 'customer' as const }
}

export async function checkUserPermissions(requiredPermission: Permission): Promise<PermissionCheckResult> {
  try {
    const current = await currentPermissions(await createClient())
    if (!current) return { error: 'Unauthorized', status: 401 }
    if (!current.permissions.includes(requiredPermission)) return { error: 'Insufficient permissions', status: 403 }
    return { user: { id: current.user.id, type: current.type } }
  } catch {
    return { error: 'Unable to verify permissions', status: 403 }
  }
}

export async function checkPermissions(context: ServerContext, requiredPermissions: string[]): Promise<boolean> {
  try {
    const current = await currentPermissions(context ? getServerSupabase(context) : await createClient())
    return !!current && requiredPermissions.every(permission => current.permissions.includes(permission as Permission))
  } catch { return false }
}
