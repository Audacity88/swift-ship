import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Category } from '@/types/knowledge';
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

    // Get all categories with article count
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select(`
        *,
        article_count:articles (count)
      `)
      .order('order');

    if (categoryError) {
      console.error('Error fetching categories:', categoryError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Process categories to include article count
    const processedCategories = categories.map(category => ({
      ...category,
      articleCount: category.article_count?.[0]?.count || 0
    }));

    // Build category tree
    const categoryTree = buildCategoryTree(processedCategories);

    return NextResponse.json({
      categories: categoryTree
    });
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

    // Get request body
    const body = await request.json();
    const { name, description, parentId, order } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // If parentId is provided, verify it exists
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        );
      }
    }

    // Get max order if not provided
    let categoryOrder = order;
    if (typeof order !== 'number') {
      const { data: maxOrder } = await supabase
        .from('categories')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .single();

      categoryOrder = (maxOrder?.order || 0) + 1;
    }

    // Create category
    const { data: category, error: createError } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        description,
        parentId,
        order: categoryOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating category:', createError);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Error in POST /api/knowledge/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 