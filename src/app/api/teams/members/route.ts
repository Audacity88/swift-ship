import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { TeamMember, TeamMemberUpdate } from '@/types/team';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check user authentication and permissions
async function checkUserPermissions(requiredPermission: Permission) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, custom_permissions')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData) {
    return { error: 'User not found', status: 404 };
  }

  const { data: permissions } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', userData.role)
    .single();

  if (!permissions?.permissions?.includes(requiredPermission)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { session, userData };
}

// Add member to team
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const body = await request.json();
    const { teamId, userId, role, schedule, skills } = body as TeamMember;

    // Validate required fields
    if (!teamId || !userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already in team
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Add member to team
    const { data: member, error: addError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        schedule,
        skills,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (addError) {
      console.error('Error adding team member:', addError);
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team member added successfully',
      member
    });
  } catch (error) {
    console.error('Error in POST /api/teams/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update member details
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const body = await request.json();
    const { teamId, userId, role, schedule, skills } = body as TeamMemberUpdate;

    // Validate required fields
    if (!teamId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if member exists
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Update member details
    const updateData: any = {};
    if (role) updateData.role = role;
    if (schedule) updateData.schedule = schedule;
    if (skills) updateData.skills = skills;
    updateData.updated_at = new Date().toISOString();

    const { data: member, error: updateError } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team member:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team member updated successfully',
      member
    });
  } catch (error) {
    console.error('Error in PUT /api/teams/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove member from team
export async function DELETE(request: NextRequest) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');

    if (!teamId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if member exists
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Remove member from team
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing team member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/teams/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 