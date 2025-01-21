import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const assignRoleSchema = z.object({
  agentId: z.string().uuid(),
  roleId: z.string().uuid(),
  customPermissions: z.array(z.nativeEnum(Permission)).optional()
});

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
    const validatedData = assignRoleSchema.parse(body);

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', validatedData.agentId)
      .single();

    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if role exists
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', validatedData.roleId)
      .single();

    if (roleError || !role) {
      console.error('Error fetching role:', roleError);
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Update agent's role
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        role_id: validatedData.roleId,
        custom_permissions: validatedData.customPermissions,
        updated_at: new Date().toISOString(),
        updated_by: permissionCheck.user.id
      })
      .eq('id', validatedData.agentId);

    if (updateError) {
      console.error('Error updating agent role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update agent role' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/roles/assign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 