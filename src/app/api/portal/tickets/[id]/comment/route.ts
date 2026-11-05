import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ content: z.string().trim().min(1).max(50000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a comment.' }, { status: 400 })
  const { data: ticket, error } = await supabase.from('tickets').select('customer_id').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load ticket.' }, { status: 500 })
  if (!ticket || ticket.customer_id !== user.id) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  const { data, error: insertError } = await supabase.from('messages').insert({
    ticket_id: id, content: parsed.data.content, author_id: user.id, author_type: 'customer', is_internal: false,
  }).select().single()
  if (insertError) return NextResponse.json({ error: 'Unable to save comment. Please retry.' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
