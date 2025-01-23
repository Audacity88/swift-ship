import { NextResponse } from 'next/server'
import { authService, tagService } from '@/lib/services'
import type { Tag } from '@/types/tag'

// GET /api/tags - Get all tags
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const ticketId = searchParams.get('ticket_id')

    let tags
    if (ticketId) {
      // Get tag suggestions for a ticket
      tags = await tagService.getSuggestions(undefined, ticketId)
    } else if (query) {
      // Search tags by name
      tags = await tagService.searchTags(undefined, query)
    } else {
      // Get all tags
      tags = await tagService.searchTags(undefined, '')
    }

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error in tags API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, color } = await request.json()

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const tag = await tagService.createTag(undefined, name, color)
    return NextResponse.json(tag)
  } catch (error: any) {
    console.error('Failed to create tag:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, name, color } = await request.json()

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      )
    }

    const tag = await tagService.updateTag(undefined, id, name, color)
    return NextResponse.json(tag)
  } catch (error: any) {
    console.error('Failed to update tag:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
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

    await tagService.deleteTag(undefined, id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// Bulk operations endpoint
export async function PATCH(request: Request) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
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