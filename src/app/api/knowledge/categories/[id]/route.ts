import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Permission } from '@/types/role';
import { checkUserPermissions } from '@/lib/auth/check-permissions';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional()
});

// GET /api/knowledge/categories/[id] - Get category details
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.VIEW_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get category
    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        *,
        articles (
          id,
          title,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching category:', error);
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error in GET /api/knowledge/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/categories/[id] - Update category
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check permissions
    const permissionCheck = await checkUserPermissions(Permission.MANAGE_KNOWLEDGE_BASE);
    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Check if category has articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id')
      .eq('category_id', params.id);

    if (articlesError) {
      console.error('Error checking category articles:', articlesError);
      return NextResponse.json(
        { error: 'Failed to check category articles' },
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
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 