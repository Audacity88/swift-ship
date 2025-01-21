import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const addMemberSchema = z.object({
  teamId: z.string().uuid(),
  agentId: z.string().uuid(),
  role: z.enum(['member', 'lead'])
});

const removeMemberSchema = z.object({
  teamId: z.string().uuid(),
  agentId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = addMemberSchema.parse(body);

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', validatedData.agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', validatedData.teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Add member to team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: validatedData.teamId,
        agent_id: validatedData.agentId,
        role: validatedData.role
      });

    if (memberError) {
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'Agent is already a member of this team' },
          { status: 400 }
        );
      }
      console.error('Error adding team member:', memberError);
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/teams/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = removeMemberSchema.parse(body);

    // Remove member from team
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', validatedData.teamId)
      .eq('agent_id', validatedData.agentId);

    if (error) {
      console.error('Error removing team member:', error);
      return NextResponse.json(
        { error: 'Failed to remove team member' },
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

    console.error('Error in DELETE /api/teams/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 