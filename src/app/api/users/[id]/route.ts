import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/auth/profile'
import { z } from 'zod'

const updatesSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: z.string().max(200).optional(),
  phone: z.string().max(100).optional(),
}).strict()

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try { return NextResponse.json(await ensureUserProfile(supabase, user)) }
  catch { return NextResponse.json({ error: 'Your account profile could not be loaded. Please contact your administrator.' }, { status: 500 }) }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = updatesSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid profile fields' }, { status: 400 })
  const { data: agent } = await supabase.from('agents').select('role').eq('id', id).maybeSingle()
  const updates = agent ? { name: parsed.data.name } : parsed.data
  const { data, error: updateError } = await supabase.from(agent ? 'agents' : 'customers')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle()
  if (updateError) return NextResponse.json({ error: 'Unable to save your profile' }, { status: 500 })
  return NextResponse.json(data)
}
