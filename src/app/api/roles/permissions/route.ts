import { NextRequest, NextResponse } from 'next/server';
import { Permission } from '@/types/role';
import { createClient } from '@supabase/supabase-js';
import { roleService } from '@/lib/services/role-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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

    // Check specific permission if provided in query
    const searchParams = request.nextUrl.searchParams;
    const checkPermission = searchParams.get('check') as Permission;

    if (checkPermission) {
      // Validate if the permission exists
      if (!roleService.isValidPermission(checkPermission)) {
        return NextResponse.json(
          { error: 'Invalid permission' },
          { status: 400 }
        );
      }

      // Return whether the user has the specific permission
      const hasPermission = await roleService.hasPermission(userId, checkPermission);
      return NextResponse.json({ hasPermission });
    }

    // Get user's role and permissions
    const role = await roleService.getUserRole(userId);
    if (!role) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const permissions = await roleService.getUserPermissions(userId);
    const defaultPermissions = roleService.getDefaultPermissions(role);
    
    // Return all permissions for the user
    return NextResponse.json({
      role,
      permissions,
      isCustom: JSON.stringify(permissions) !== JSON.stringify(defaultPermissions)
    });
  } catch (error) {
    console.error('Error in GET /api/roles/permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 