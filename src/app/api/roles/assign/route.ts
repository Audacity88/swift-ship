import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AGENT_ROLES, RoleType } from '@/types/role'
import { z } from 'zod'

const inputSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(RoleType).optional(),
  roleId: z.string().uuid().optional()
}).refine(value => !!value.role || !!value.roleId)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: actor } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
  if (actor?.role !== RoleType.ADMIN) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const input = inputSchema.safeParse(await request.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: 'An agent ID and staff role are required' }, { status: 400 })

  let role = input.data.role
  if (!role && input.data.roleId) {
    const { data: savedRole } = await supabase.from('roles').select('name').eq('id', input.data.roleId).maybeSingle()
    role = savedRole?.name as RoleType | undefined
  }
  if (!role || !AGENT_ROLES.includes(role)) return NextResponse.json({ error: 'Select a valid staff role' }, { status: 400 })
  const { data, error } = await supabase.from('agents').update({ role, updated_at: new Date().toISOString() })
    .eq('id', input.data.userId).select('id,role').maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not assign role' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Existing agent not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE() {
  return NextResponse.json({ error: 'Agents must have a staff role. Assign the agent role to remove elevated access.' }, { status: 405 })
}
