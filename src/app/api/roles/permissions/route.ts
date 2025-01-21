import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_ROLES);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get all permissions
    const permissions = Object.values(Permission);

    // Get role permissions matrix
    const { data: rolePermissions, error } = await supabase
      .from('role_permissions')
      .select(`
        role:roles (
          id,
          name,
          description
        ),
        permission
      `)
      .order('permission', { ascending: true });

    if (error) {
      console.error('Error fetching role permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch role permissions' },
        { status: 500 }
      );
    }

    // Build permissions matrix
    const matrix = rolePermissions.reduce((acc, { role, permission }) => {
      if (!acc[role.id]) {
        acc[role.id] = {
          role: {
            id: role.id,
            name: role.name,
            description: role.description
          },
          permissions: []
        };
      }
      acc[role.id].permissions.push(permission);
      return acc;
    }, {} as Record<string, { role: { id: string; name: string; description: string | null }; permissions: Permission[] }>);

    return NextResponse.json({
      permissions,
      roles: Object.values(matrix)
    });
  } catch (error) {
    console.error('Error in GET /api/roles/permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 