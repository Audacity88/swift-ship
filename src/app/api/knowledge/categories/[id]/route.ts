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

// GET /api/knowledge/categories/[id] - Get category details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get category with article count and subcategories
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select(`
        *,
        article_count:articles (count),
        subcategories:categories (
          id,
          name,
          slug,
          description,
          order,
          article_count:articles (count)
        )
      `)
      .eq('id', params.id)
      .single();

    if (categoryError) {
      console.error('Error fetching category:', categoryError);
      return NextResponse.json(
        { error: 'Failed to fetch category' },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Process category to include article count
    const processedCategory = {
      ...category,
      articleCount: category.article_count?.[0]?.count || 0,
      subcategories: category.subcategories?.map((sub: { article_count: { count: number }[] }) => ({
        ...sub,
        articleCount: sub.article_count?.[0]?.count || 0
      }))
    };

    return NextResponse.json({
      category: processedCategory
    });
  } catch (error) {
    console.error('Error in GET /api/knowledge/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Generate slug if name changed
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // If parentId is provided and changed, verify it exists and check for circular reference
    if (parentId) {
      // Check if parent exists
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

      // Check for circular reference
      if (parentId === params.id) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }
    }

    // Update category
    const { data: category, error: updateError } = await supabase
      .from('categories')
      .update({
        name,
        slug,
        description,
        parentId,
        order,
        updatedAt: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Error in PUT /api/knowledge/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if category has subcategories
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('categories')
      .select('id')
      .eq('parentId', params.id);

    if (subcategoriesError) {
      console.error('Error checking subcategories:', subcategoriesError);
      return NextResponse.json(
        { error: 'Failed to check subcategories' },
        { status: 500 }
      );
    }

    if (subcategories && subcategories.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories' },
        { status: 400 }
      );
    }

    // Check if category has articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id')
      .eq('categoryId', params.id);

    if (articlesError) {
      console.error('Error checking articles:', articlesError);
      return NextResponse.json(
        { error: 'Failed to check articles' },
        { status: 500 }
      );
    }

    if (articles && articles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with articles' },
        { status: 400 }
      );
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 