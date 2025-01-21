import { NextRequest, NextResponse } from 'next/server';
import { Permission, UserRole } from '@/types/role';
import { createClient } from '@supabase/supabase-js';
import { roleService } from '@/lib/services/role-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const assignerId = session.user.id;

    // Check if user has permission to manage roles
    const hasPermission = await roleService.hasPermission(assignerId, Permission.MANAGE_ROLES);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, role, customPermissions } = body as {
      userId: string;
      role: UserRole;
      customPermissions?: Permission[];
    };

    // Validate required fields
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!roleService.isValidRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate custom permissions if provided
    if (customPermissions) {
      const invalidPermissions = customPermissions.filter(
        p => !roleService.isValidPermission(p)
      );
      
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate role assignment
    const validation = await roleService.validateRoleAssignment(assignerId, userId, role);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Assign role using the service
    const success = await roleService.assignRole({
      userId,
      role,
      customPermissions,
      assignedBy: assignerId,
      assignedAt: new Date()
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Role assigned successfully',
      data: {
        userId,
        role,
        customPermissions,
        assignedBy: assignerId,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error in POST /api/roles/assign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 