import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check user permissions
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

// GET /api/portal/profile - Get customer profile
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_PORTAL);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;

    // Get customer profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .select(`
        *,
        preferences:portal_preferences (*),
        company:companies (
          id,
          name,
          domain
        )
      `)
      .eq('userId', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('portal_activity')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(5);

    if (activityError) {
      console.error('Error fetching activity:', activityError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      profile: {
        ...profile,
        recentActivity: recentActivity || []
      }
    });
  } catch (error) {
    console.error('Error in GET /api/portal/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/portal/profile - Update customer profile
export async function PUT(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_PORTAL);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const { session } = permissionCheck;

    // Get request body
    const body = await request.json();
    const {
      jobTitle,
      timezone,
      language,
      preferences = {}
    } = body;

    // Update profile
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .update({
        jobTitle,
        timezone,
        language,
        updatedAt: new Date().toISOString()
      })
      .eq('userId', session.user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Update preferences if provided
    if (Object.keys(preferences).length > 0) {
      const { error: prefError } = await supabase
        .from('portal_preferences')
        .upsert({
          userId: session.user.id,
          ...preferences,
          updatedAt: new Date().toISOString()
        });

      if (prefError) {
        console.error('Error updating preferences:', prefError);
        // Don't fail the request, just log the error
      }
    }

    // Track activity
    const { error: activityError } = await supabase
      .from('portal_activity')
      .insert({
        userId: session.user.id,
        type: 'PROFILE_UPDATE',
        createdAt: new Date().toISOString()
      });

    if (activityError) {
      console.error('Error tracking activity:', activityError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Error in PUT /api/portal/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 