import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import { tagService } from '@/lib/services'
import type { Tag } from '@/types/tag'

// GET /api/tags - Get all tags
export async function GET() {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user role to check if they are an agent or admin
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only allow agents and admins to view tags
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized - Agent access required' },
        { status: 403 }
      )
    }

    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error in GET /api/tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: Request) {
  try {
    const { operation, tagIds, ticketIds }: {
      operation: 'add' | 'remove'
      tagIds: string[]
      ticketIds: string[]
    } = await request.json()

    if (!tagIds?.length || !ticketIds?.length) {
      return NextResponse.json(
        { error: 'Tag IDs and ticket IDs are required' },
        { status: 400 }
      )
    }

    // Process each tag-ticket pair individually
    await Promise.all(
      ticketIds.flatMap(ticketId =>
        tagIds.map(tagId =>
          operation === 'add'
            ? tagService.addTagToTicket(undefined, tagId, ticketId)
            : tagService.removeTagFromTicket(undefined, tagId, ticketId)
        )
      )
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to perform tag operation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// PUT /api/tags/:id - Update a tag
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tag = await request.json()

    if (!tag.id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tags')
      .update({
        ...tag,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', tag.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tag:', error)
      return NextResponse.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tags/:id - Delete a tag
export async function DELETE(request: Request) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting tag:', error)
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk operations endpoint
export async function PATCH(request: Request) {
  try {
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { operation, tagIds, ticketIds }: {
      operation: 'add' | 'remove'
      tagIds: string[]
      ticketIds: string[]
    } = await request.json()

    if (!tagIds?.length || !ticketIds?.length) {
      return NextResponse.json(
        { error: 'Tag IDs and ticket IDs are required' },
        { status: 400 }
      )
    }

    await tagService.bulkUpdateTicketTags(undefined, operation, tagIds, ticketIds)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to perform bulk tag operation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 