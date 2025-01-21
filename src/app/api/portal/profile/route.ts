import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean()
    }).optional()
  }).optional()
});

// GET /api/portal/profile - Get customer profile
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_PROFILE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get customer profile
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', permissionCheck.user.id)
      .single();

    if (error) {
      console.error('Error fetching customer profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(customer);
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
    const permissionCheck = await checkUserPermissions(Permission.UPDATE_PROFILE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update customer profile
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        company: validatedData.company,
        preferences: validatedData.preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', permissionCheck.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/portal/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 