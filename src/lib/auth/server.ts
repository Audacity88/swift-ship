import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireStaff(adminOnly = false) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: agent, error: roleError } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
  if (roleError || !agent || (adminOnly ? agent.role !== 'admin' : !['admin', 'agent', 'supervisor'].includes(agent.role))) {
    return { response: NextResponse.json({ error: adminOnly ? 'Admin access required' : 'Staff access required' }, { status: 403 }) }
  }
  return { supabase, user, agent }
}
