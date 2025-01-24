import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const scheduleSchema = z.object({
  shifts: z.array(z.object({
    agentId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
  }))
});

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';
    const isTeamMember = agent?.team_id === params.id;

    if (!isAdmin && !isTeamMember) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or team member access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    // Build base query
    let query = supabase
      .from('team_schedules')
      .select(`
        *,
        agent:agents(
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('team_id', params.id);

    // Apply date filters if provided
    if (dateFrom) {
      query = query.gte('start_time', dateFrom);
    }
    if (dateTo) {
      query = query.lte('end_time', dateTo);
    }

    // Execute query
    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching team schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team schedules' },
        { status: 500 }
      );
    }

    return NextResponse.json(schedules || []);
  } catch (error) {
    console.error('Error in GET /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = scheduleSchema.parse(body);

    // Insert schedules
    const scheduleData = validatedData.shifts.map(shift => ({
      team_id: params.id,
      agent_id: shift.agentId,
      start_time: shift.startTime,
      end_time: shift.endTime
    }));

    const { data: schedules, error } = await supabase
      .from('team_schedules')
      .insert(scheduleData)
      .select();

    if (error) {
      console.error('Error creating team schedules:', error);
      return NextResponse.json(
        { error: 'Failed to create team schedules' },
        { status: 500 }
      );
    }

    return NextResponse.json(schedules);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    // Delete schedule
    const { error } = await supabase
      .from('team_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('team_id', params.id);

    if (error) {
      console.error('Error deleting team schedule:', error);
      return NextResponse.json(
        { error: 'Failed to delete team schedule' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = agent?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Update schedule
    const { data: updatedSchedule, error } = await supabase
      .from('team_schedules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('team_id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update team schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error in PATCH /api/teams/schedule/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 