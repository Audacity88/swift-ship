import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { Team, TeamUpdateData } from '@/types/team';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check user authentication and permissions
async function checkUserPermissions(requiredPermission: Permission) {
  // Check if user is authenticated
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Get user's role and permissions
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, custom_permissions')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData) {
    return { error: 'User not found', status: 404 };
  }

  // Check if user has required permission
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

    // Get team with all related data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members (
          user:users (
            id,
            name,
            email,
            role
          ),
          role,
          schedule,
          skills,
          joined_at
        ),
        skills:team_skills (
          name,
          level,
          description
        ),
        metrics:team_metrics (
          average_response_time,
          average_resolution_time,
          open_tickets,
          resolved_tickets,
          customer_satisfaction_score,
          updated_at
        )
      `)
      .eq('id', params.id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return NextResponse.json(
        { error: 'Failed to fetch team' },
        { status: 500 }
      );
    }

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get request body
    const body = await request.json();
    const { name, description, schedule, skills, isActive } = body as TeamUpdateData;

    // Validate team exists
    const { data: existingTeam, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', params.id)
      .single();

    if (teamError || !existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Update team
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({
        name,
        description,
        schedule,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    // Update skills if provided
    if (skills) {
      // Delete existing skills
      await supabase
        .from('team_skills')
        .delete()
        .eq('team_id', params.id);

      // Add new skills
      if (skills.length > 0) {
        const { error: skillsError } = await supabase
          .from('team_skills')
          .insert(
            skills.map(skill => ({
              team_id: params.id,
              ...skill,
            }))
          );

        if (skillsError) {
          console.error('Error updating team skills:', skillsError);
          // Don't fail the request, but log the error
        }
      }
    }

    return NextResponse.json({
      message: 'Team updated successfully',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Error in PUT /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if team exists and is not already deleted
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('is_active')
      .eq('id', params.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Soft delete the team by marking it as inactive
    const { error: deleteError } = await supabase
      .from('teams')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 