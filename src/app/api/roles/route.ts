import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.nativeEnum(Permission))
});

export async function GET() {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_ROLES);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get roles with permissions
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        *,
        permissions:role_permissions (
          permission
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      );
    }

    // Format roles
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions.map(p => p.permission)
    }));

    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error('Error in GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_ROLES);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    // Start transaction
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        created_by: permissionCheck.user.id
      })
      .select()
      .single();

    if (roleError) {
      console.error('Error creating role:', roleError);
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      );
    }

    // Add permissions
    const { error: permissionsError } = await supabase
      .from('role_permissions')
      .insert(
        validatedData.permissions.map(permission => ({
          role_id: role.id,
          permission
        }))
      );

    if (permissionsError) {
      console.error('Error adding role permissions:', permissionsError);
      return NextResponse.json(
        { error: 'Failed to add role permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 