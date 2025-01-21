import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Category } from '@/types/knowledge';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to build category tree
function buildCategoryTree(categories: Category[], parentId: string | null = null): Category[] {
  return categories
    .filter(category => category.parentId === parentId)
    .map(category => ({
      ...category,
      children: buildCategoryTree(categories, category.id)
    }))
    .sort((a, b) => a.order - b.order);
}

const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional()
});

// GET /api/knowledge/categories - Get category tree
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const flat = searchParams.get('flat') === 'true';

    // Get categories
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Return flat list or tree structure
    return NextResponse.json(
      flat ? categories : buildCategoryTree(categories || [])
    );
  } catch (error) {
    console.error('Error in GET /api/knowledge/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Get max order if not provided
    if (typeof validatedData.order !== 'number') {
      const { data: maxOrder } = await supabase
        .from('categories')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .single();

      validatedData.order = (maxOrder?.order || 0) + 1;
    }

    // Create category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        parent_id: validatedData.parentId,
        order: validatedData.order,
        created_by: permissionCheck.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/knowledge/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 