import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-client';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

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
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get customer profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        organization:organization_id(*)
      `)
      .eq('id', user.id)
      .single();

    if (customerError) {
      console.error('Error fetching customer profile:', customerError);
      return NextResponse.json(
        { error: 'Failed to fetch customer profile' },
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
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, phone, preferences } = await request.json();

    // Update customer profile
    const { data: customer, error: updateError } = await supabase
      .from('customers')
      .update({
        name,
        phone,
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update customer profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error in PUT /api/portal/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 