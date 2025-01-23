import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          agent:agent_id(*)
        ),
        schedule:team_schedules(*)
      `)
      .eq('id', params.id)
      .single();

    if (teamError || !team) {
      console.error('Error fetching team:', teamError);
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { name, description, schedule } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Update team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', params.id)
      .select()
      .single();

    if (teamError) {
      console.error('Error updating team:', teamError);
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    // Update schedule if provided
    if (schedule) {
      const { error: scheduleError } = await supabase
        .from('team_schedules')
        .upsert({
          team_id: params.id,
          ...schedule,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        });

      if (scheduleError) {
        console.error('Error updating team schedule:', scheduleError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error in PUT /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if team has any active tickets
    const { count: activeTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .eq('team_id', params.id)
      .not('status', 'eq', 'closed');

    if (activeTickets && activeTickets > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team with active tickets' },
        { status: 400 }
      );
    }

    // Delete team
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 