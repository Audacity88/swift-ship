import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { TeamMetrics } from '@/types/team';

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

// Get team metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TEAM_METRICS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get team metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('team_metrics')
      .select(`
        *,
        team:teams (
          id,
          name
        )
      `)
      .eq('team_id', params.id)
      .single();

    if (metricsError) {
      console.error('Error fetching team metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch team metrics' },
        { status: 500 }
      );
    }

    if (!metrics) {
      return NextResponse.json(
        { error: 'Team metrics not found' },
        { status: 404 }
      );
    }

    // Get historical metrics for trends
    const { data: historicalMetrics, error: historyError } = await supabase
      .from('team_metrics_history')
      .select('*')
      .eq('team_id', params.id)
      .order('timestamp', { ascending: false })
      .limit(30); // Last 30 data points

    if (historyError) {
      console.error('Error fetching historical metrics:', historyError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      currentMetrics: metrics,
      historicalMetrics: historicalMetrics || []
    });
  } catch (error) {
    console.error('Error in GET /api/teams/metrics/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update team metrics
export async function POST(
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

    // Store current metrics in history
    const { data: currentMetrics } = await supabase
      .from('team_metrics')
      .select('*')
      .eq('team_id', params.id)
      .single();

    if (currentMetrics) {
      await supabase
        .from('team_metrics_history')
        .insert({
          team_id: params.id,
          ...currentMetrics,
          timestamp: currentMetrics.updated_at
        });
    }

    // Update team metrics
    const { data: updatedMetrics, error: updateError } = await supabase
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