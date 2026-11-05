import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaff } from '@/lib/auth/server'

const updateAgentSchema = z.object({
  name: z.string().trim().min(1).max(200), email: z.string().email(),
  role: z.enum(['agent', 'admin', 'supervisor']),
  team_id: z.string().uuid().optional(), avatar: z.string().url().optional(),
}).strict()

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff(true)
    if (auth.response) return auth.response
    const { id } = await context.params
    const parsed = updateAgentSchema.safeParse(await request.json())
    if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid agent fields' }, { status: 400 })
    if (id === auth.user.id && parsed.data.role !== 'admin') return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 })
    const { data: previous, error: previousError } = await auth.supabase.from('agents').select('*').eq('id', id).maybeSingle()
    if (previousError || !previous) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email: parsed.data.email, user_metadata: { name: parsed.data.name }, app_metadata: { staff: true },
    })
    if (authError) return NextResponse.json({ error: 'Unable to update the auth account' }, { status: 500 })
    const { data: agent, error } = await auth.supabase.from('agents').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle()
    if (error || !agent) {
      await admin.auth.admin.updateUserById(id, { email: previous.email, user_metadata: { name: previous.name } })
      return NextResponse.json({ error: 'Unable to update the agent profile' }, { status: 500 })
    }
    return NextResponse.json(agent)
  } catch {
    return NextResponse.json({ error: 'Unable to update the agent' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth.response) return auth.response
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  const { data, error } = await auth.supabase.from('agents').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to fetch the agent' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  return NextResponse.json(data)
}
