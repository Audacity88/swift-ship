import type { SupabaseClient, User as AuthUser } from '@supabase/supabase-js'

export const PROFILE_MISSING_MESSAGE = 'Your account is signed in, but its profile could not be loaded. Please try signing in again. If this continues, contact your administrator.'

// Staff identity comes from the protected agents table, never editable auth metadata.
export async function ensureUserProfile(supabase: SupabaseClient, user: AuthUser) {
  const { data: agent, error: agentError } = await supabase
    .from('agents').select('*').eq('id', user.id).maybeSingle()
  if (agentError) throw new Error(PROFILE_MISSING_MESSAGE)
  if (agent) return { ...agent, type: 'agent' as const }

  const { data: customer, error: customerError } = await supabase
    .from('customers').select('*').eq('id', user.id).maybeSingle()
  if (customerError) throw new Error(PROFILE_MISSING_MESSAGE)
  if (customer) return { ...customer, role: 'customer', type: 'customer' as const }
  if (!user.email) throw new Error(PROFILE_MISSING_MESSAGE)

  // Covers older auth accounts and installations where the signup trigger was missing.
  // RLS allows only this user's id on a customer insert.
  const { data: profile, error } = await supabase.from('customers').upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
    company: user.user_metadata?.company || null,
  }, { onConflict: 'id', ignoreDuplicates: true }).select('*').maybeSingle()
  if (error) throw new Error(PROFILE_MISSING_MESSAGE)
  if (profile) return { ...profile, role: 'customer', type: 'customer' as const }

  // A concurrent auth initialization may have inserted the row first.
  const { data: existing, error: readError } = await supabase
    .from('customers').select('*').eq('id', user.id).maybeSingle()
  if (readError || !existing) throw new Error(PROFILE_MISSING_MESSAGE)
  return { ...existing, role: 'customer', type: 'customer' as const }
}
