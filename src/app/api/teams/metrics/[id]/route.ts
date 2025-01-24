import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { TeamMetrics } from '@/types/team';
import { checkUserPermissions } from '@/lib/auth/check-permissions';

// Get team metrics
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

    // Get team metrics
    const { data: metrics, error } = await supabase
      .from('team_metrics')
      .select(`
        *,
        team:team_id(name)
      `)
      .eq('team_id', params.id)
      .order('period', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching team metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error in GET /api/teams/metrics/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update team metrics
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const body = await request.json();
    const metrics = body as TeamMetrics;

    // Validate metrics
    if (!metrics || typeof metrics.averageResponseTime !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metrics format' },
        { status: 400 }
      );
    }

    // Check if team exists
    const { data: team, error: teamError } = await getServerSupabase()
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

    // Store current metrics in history
    const { data: currentMetrics } = await getServerSupabase()
      .from('team_metrics')
      .select('*')
      .eq('team_id', params.id)
      .single();

    if (currentMetrics) {
      await getServerSupabase()
        .from('team_metrics_history')
        .insert({
          team_id: params.id,
          ...currentMetrics,
          timestamp: currentMetrics.updated_at
        });
    }

    // Update team metrics
    const { data: updatedMetrics, error: updateError } = await getServerSupabase()
      .from('team_metrics')
      .upsert({
        team_id: params.id,
        average_response_time: metrics.averageResponseTime,
        average_resolution_time: metrics.averageResolutionTime,
        open_tickets: metrics.openTickets,
        resolved_tickets: metrics.resolvedTickets,
        customer_satisfaction_score: metrics.customerSatisfactionScore,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team metrics:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Team metrics updated successfully',
      metrics: updatedMetrics
    });
  } catch (error) {
    console.error('Error in POST /api/teams/metrics/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 