import { NextResponse } from 'next/server';
import { Permission, RoleType } from '@/types/role';
import { createClient } from '@supabase/supabase-js';
import { roleService } from '@/lib/services/role-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Check if user has permission to view roles
    const hasPermission = await roleService.hasAnyPermission(
      userId, 
      [Permission.VIEW_ROLES, Permission.MANAGE_ROLES]
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all roles and generate permission matrix
    const roles = await roleService.getAllRoles();
    const permissionMatrix = roleService.generatePermissionMatrix();

    return NextResponse.json({
      roles,
      permissions: Object.values(Permission),
      permissionMatrix
    });
  } catch (error) {
    console.error('Error in GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user has permission to manage roles
    const hasPermission = await roleService.hasPermission(userId, Permission.MANAGE_ROLES);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, role, customPermissions } = body;

    // Validate role assignment
    const validation = await roleService.validateRoleAssignment(userId, targetUserId, role);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Assign role
    const success = await roleService.assignRole({
      userId: targetUserId,
      role,
      customPermissions,
      assignedBy: userId,
      assignedAt: new Date()
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 