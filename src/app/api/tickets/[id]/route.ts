import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import { TicketPriority, TicketStatus } from '@/types/ticket'
import { z } from 'zod'
import { Permission } from '@/types/role'
import { getUserRole, hasAnyPermission } from '@/lib/auth/permissions'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Types
interface TicketResult {
  id: string
  description: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  customer_id: string
  assignee_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  resolved_at: string | null
  is_archived: boolean
  customerName: string
  customerEmail: string
  customerAvatar: string | null
  customerCompany: string | null
  assigneeName: string | null
  assigneeEmail: string | null
  assigneeAvatar: string | null
  assigneeRole: 'agent' | 'admin' | null
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  messages: Array<{
    id: string
    content: string
    authorType: 'customer' | 'agent'
    authorId: string
    createdAt: string
    updatedAt: string
  }>
  snapshots: Array<{
    id: string
    snapshotAt: string
    data: Record<string, unknown>
    reason: string | null
    triggeredBy: string
  }>
}

// Validation schema for updating a ticket
const updateTicketSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.URGENT
  ]).optional(),
  status: z.enum([
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.AWAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED
  ]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional()
})

// Helper function to get authenticated supabase client
async function getAuthenticatedClient() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        async set(name: string, value: string, options: any) {
          await cookieStore.set({ name, value, ...options })
        },
        async remove(name: string, options: any) {
          await cookieStore.delete(name, options)
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  return { supabase, user }
}

// GET /api/tickets/[id] - Get a single ticket
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const { id } = await context.params

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        assignee:agents!tickets_assignee_id_fkey (
          id,
          name,
          email,
          avatar,
          role
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching ticket:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in GET ticket:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const { id } = await context.params
    const body = await request.json()

    // Update ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        assignee_id: body.assigneeId,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', id)
      .select('*, assignee:agents!tickets_assignee_id_fkey(*)')
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    // Create audit log entry for assignment change
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'ticket',
        entity_id: id,
        action: 'update',
        actor_id: user.id,
        actor_type: 'agent',
        changes: {
          assignee_id: body.assigneeId
        }
      })

    if (auditError) {
      console.error('Error creating audit log:', auditError)
    }

    return NextResponse.json({
      ticketId: id,
      assigneeId: body.assigneeId,
      ticket
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in PATCH ticket:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}