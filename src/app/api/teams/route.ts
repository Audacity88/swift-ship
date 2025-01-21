import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Team } from '@/types/team';
import { Permission } from '@/types/role';

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

    // Get user's role and permissions
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, custom_permissions')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view teams
    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permissions')
      .eq('role', userData.role)
      .single();

    if (!permissions?.permissions?.includes(Permission.VIEW_TEAMS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const query = supabase.from('teams').select(`
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
    `);

    // Apply active filter if provided
    if (isActive !== null) {
      query.eq('is_active', isActive === 'true');
    }

    // Execute query
    const { data: teams, error: teamsError } = await query;

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error in GET /api/teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get user's role and permissions
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, custom_permissions')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to manage teams
    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permissions')
      .eq('role', userData.role)
      .single();

    if (!permissions?.permissions?.includes(Permission.MANAGE_TEAMS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { name, description, schedule, skills } = body;

    // Validate required fields
    if (!name || !schedule) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        schedule,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating team:', createError);
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      );
    }

    // Add skills if provided
    if (skills && skills.length > 0) {
      const { error: skillsError } = await supabase
        .from('team_skills')
        .insert(
          skills.map((skill: any) => ({
            team_id: team.id,
            ...skill,
          }))
        );

      if (skillsError) {
        console.error('Error adding team skills:', skillsError);
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 