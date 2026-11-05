import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaff } from '@/lib/auth/server'

const agentSchema = z.object({
  name: z.string().trim().min(1).max(200), email: z.string().email(),
  role: z.enum(['agent', 'admin', 'supervisor']),
  team_id: z.string().uuid().optional(), avatar: z.string().url().optional(),
}).strict()
const adminClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true)
    if (auth.response) return auth.response
    const parsed = agentSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid agent fields' }, { status: 400 })
    const data = parsed.data
    const admin = adminClient()
    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/update-password`,
      data: { name: data.name, force_password_reset: true },
    })
    if (inviteError || !invitation.user) return NextResponse.json({ error: 'Unable to invite this account. Check whether it already exists.' }, { status: 409 })
    // Invitations cannot set app_metadata on creation. Only this checked admin route
    // marks the auth account as staff. The agents row controls the actual role.
    const { error: metadataError } = await admin.auth.admin.updateUserById(invitation.user.id, {
      app_metadata: { ...invitation.user.app_metadata, staff: true },
    })
    if (metadataError) return NextResponse.json({ error: 'Invitation created, but staff setup failed. Ask an administrator to retry.' }, { status: 500 })
    const { data: agent, error } = await auth.supabase.from('agents').upsert({
      ...data, id: invitation.user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select('*').single()
    if (error) return NextResponse.json({ error: 'Invitation created, but the agent profile could not be saved. Ask an administrator to retry.' }, { status: 500 })
    return NextResponse.json(agent)
  } catch {
    return NextResponse.json({ error: 'Unable to create the agent' }, { status: 500 })
  }
}

export async function GET() {
  const auth = await requireStaff()
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase.from('agents').select('*').order('name')
  if (error) return NextResponse.json({ error: 'Unable to fetch agents' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaff(true)
    if (auth.response) return auth.response
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'A valid agent ID is required' }, { status: 400 })
    if (id === auth.user.id) return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
    const { data: removed, error } = await auth.supabase.from('agents').delete().eq('id', id).select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'Unable to remove the agent. Reassign their work first.' }, { status: 409 })
    if (!removed) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    const { error: authError } = await adminClient().auth.admin.deleteUser(id)
    if (authError) return NextResponse.json({ error: 'Agent access was removed, but the auth account could not be deleted. Ask an administrator to retry.' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete the agent' }, { status: 500 })
  }
}
