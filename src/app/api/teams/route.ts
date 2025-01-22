import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const query = supabase.from('teams').select(`
      *,
      members:team_members (
        agent:agents (
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

    if (isActive !== null) {
      query.eq('is_active', isActive === 'true');
    }

    const { data: teams, error } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
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
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
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

    // Create team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        schedule,
        created_by: permissionCheck.session.user.id,
        is_active: true
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
    if (skills?.length) {
      const { error: skillsError } = await supabase
        .from('team_skills')
        .insert(
          skills.map((skill: any) => ({
            team_id: team.id,
            ...skill
          }))
        );

      if (skillsError) {
        console.error('Error adding team skills:', skillsError);
        // Don't fail the request, just log the error
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