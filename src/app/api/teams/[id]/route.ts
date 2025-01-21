import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get team details with members
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          agent:agents(
            id,
            name,
            email,
            avatar_url
          ),
          role,
          joined_at
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching team:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team' },
        { status: 500 }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTeamSchema.parse(body);

    // Update team
    const { data: team, error } = await supabase
      .from('teams')
      .update({
        name: validatedData.name,
        description: validatedData.description,
        status: validatedData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team:', error);
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/teams/[id]:', error);
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
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_TEAMS);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Delete team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting team:', error);
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 