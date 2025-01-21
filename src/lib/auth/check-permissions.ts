import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    // Get session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Check if user is an agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, role_id, custom_permissions')
      .eq('id', session.user.id)
      .single();

    if (!agentError && agent) {
      // Get agent's role permissions
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role_id', agent.role_id);

      const permissions = rolePermissions?.map(rp => rp.permission) || [];
      const hasPermission = permissions.includes(requiredPermission) ||
                          agent.custom_permissions?.includes(requiredPermission);

      if (!hasPermission) {
        return { error: 'Insufficient permissions', status: 403 };
      }

      return { user: { id: agent.id, type: 'agent' } };
    }

    // If not an agent, check if user is a customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (customerError || !customer) {
      return { error: 'User not found', status: 404 };
    }

    // Customers have limited permissions
    const customerPermissions = [
      Permission.VIEW_PROFILE,
      Permission.UPDATE_PROFILE,
      Permission.VIEW_TICKETS,
      Permission.CREATE_TICKETS,
      Permission.CREATE_COMMENTS,
      Permission.VIEW_KNOWLEDGE_BASE
    ];

    if (!customerPermissions.includes(requiredPermission)) {
      return { error: 'Insufficient permissions', status: 403 };
    }

    return { user: { id: customer.id, type: 'customer' } };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { error: 'Internal server error', status: 500 };
  }
} 