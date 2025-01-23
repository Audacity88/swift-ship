import { NextRequest, NextResponse } from 'next/server'
import { authService, ticketService } from '@/lib/services'
import type { TicketRelationship } from '@/lib/services/ticket-service'

// GET /api/tickets/[id]/linked-problems - Get all linked problem tickets
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ID from params
    const { id } = await context.params

    // Get linked problems for the ticket
    const linkedProblems = await ticketService.getLinkedProblems(undefined, id)
    return NextResponse.json(linkedProblems)
  } catch (error: any) {
    console.error('Error in GET /api/tickets/[id]/linked-problems:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// POST /api/tickets/[id]/linked-problems - Link a problem ticket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ID from params
    const { id } = await context.params
    const { problemTicketId } = await request.json()

    if (!problemTicketId) {
      return NextResponse.json(
        { error: 'Problem ticket ID is required' },
        { status: 400 }
      )
    }

    // Link the problem ticket
    await ticketService.linkProblem(undefined, id, problemTicketId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/tickets/[id]/linked-problems:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

// DELETE /api/tickets/[id]/linked-problems - Unlink a problem ticket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the ID from params
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const problemTicketId = searchParams.get('problemTicketId')

    if (!problemTicketId) {
      return NextResponse.json(
        { error: 'Problem ticket ID is required' },
        { status: 400 }
      )
    }

    // Unlink the problem ticket
    await ticketService.unlinkProblem(undefined, id, problemTicketId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/tickets/[id]/linked-problems:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 