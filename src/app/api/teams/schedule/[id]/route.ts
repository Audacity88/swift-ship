import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import type { TeamSchedule } from '@/types/team';

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

// Get team schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get team schedule and member schedules
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        id,
        schedule,
        members:team_members (
          user:users (
            id,
            name,
            email
          ),
          schedule
        )
      `)
      .eq('id', params.id)
      .single();

    if (teamError) {
      console.error('Error fetching team schedule:', teamError);
      return NextResponse.json(
        { error: 'Failed to fetch team schedule' },
        { status: 500 }
      );
    }

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      teamSchedule: team.schedule,
      memberSchedules: team.members
    });
  } catch (error) {
    console.error('Error in GET /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update team schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAM_SCHEDULE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const body = await request.json();
    const schedule = body as TeamSchedule;

    // Validate schedule
    if (!schedule || !schedule.timezone) {
      return NextResponse.json(
        { error: 'Invalid schedule format' },
        { status: 400 }
      );
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', params.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Update team schedule
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({
        schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team schedule updated successfully',
      schedule: updatedTeam.schedule
    });
  } catch (error) {
    console.error('Error in PUT /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 