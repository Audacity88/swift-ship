import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Handle cookie setting error silently
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Handle cookie removal error silently
          }
        },
      },
    }
  )
}

// GET /api/tags - Get all tags
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Failed to fetch tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json(tags)
  } catch (err) {
    console.error('Error in tags API:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const tag: Tag = await request.json()

    // Validate required fields
    if (!tag.name || !tag.color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', tag.name)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tags')
      .insert(tag)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const tag: Tag = await request.json()

    if (!tag.id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', tag.name)
      .neq('id', tag.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tags')
      .update(tag)
      .eq('id', tag.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update tag:', error)
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Check for child tags
    const { data: children } = await supabase
      .from('tags')
      .select('id')
      .eq('parent_id', id)
      .limit(1)

    if (children?.length) {
      return NextResponse.json(
        { error: 'Cannot delete tag with child tags' },
        { status: 400 }
      )
    }

    // Check for tag usage
    const { data: usage } = await supabase
      .from('ticket_tags')
      .select('ticket_id')
      .eq('tag_id', id)
      .limit(1)

    if (usage?.length) {
      return NextResponse.json(
        { error: 'Cannot delete tag that is in use' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}

// Bulk operations endpoint
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
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

    if (operation === 'add') {
      // Create tag-ticket associations
      const associations = ticketIds.flatMap(ticketId =>
        tagIds.map(tagId => ({
          ticket_id: ticketId,
          tag_id: tagId
        }))
      )

      const { error } = await supabase
        .from('ticket_tags')
        .upsert(associations)

      if (error) throw error
    } else {
      // Remove tag-ticket associations
      const { error } = await supabase
        .from('ticket_tags')
        .delete()
        .in('ticket_id', ticketIds)
        .in('tag_id', tagIds)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to perform bulk tag operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk tag operation' },
      { status: 500 }
    )
  }
} 