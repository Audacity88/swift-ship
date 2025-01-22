import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { TeamMetrics } from '@/types/team';
import { checkUserPermissions } from '@/lib/auth/check-permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get team metrics
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    // Build base query
    let query = supabase
      .from('team_metrics')
      .select(`
        *,
        team:teams(
          id,
          name
        )
      `)
      .eq('team_id', params.id);

    // Apply date filters if provided
    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    // Execute query
    const { data: metrics, error } = await query;

    if (error) {
      console.error('Error fetching team metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team metrics' },
        { status: 500 }
      );
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = {
      totalTickets: 0,
      resolvedTickets: 0,
      averageResponseTime: 0,
      averageResolutionTime: 0,
      customerSatisfactionScore: 0,
      metrics: metrics || []
    };

    if (metrics && metrics.length > 0) {
      let totalResponseTime = 0;
      let totalResolutionTime = 0;
      let totalSatisfactionScore = 0;

      metrics.forEach(metric => {
        aggregatedMetrics.totalTickets += metric.total_tickets || 0;
        aggregatedMetrics.resolvedTickets += metric.resolved_tickets || 0;
        totalResponseTime += metric.average_response_time || 0;
        totalResolutionTime += metric.average_resolution_time || 0;
        totalSatisfactionScore += metric.customer_satisfaction_score || 0;
      });

      aggregatedMetrics.averageResponseTime = totalResponseTime / metrics.length;
      aggregatedMetrics.averageResolutionTime = totalResolutionTime / metrics.length;
      aggregatedMetrics.customerSatisfactionScore = totalSatisfactionScore / metrics.length;
    }

    return NextResponse.json(aggregatedMetrics);
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