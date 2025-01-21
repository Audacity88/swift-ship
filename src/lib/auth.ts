import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function auth() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user is an agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (agent) {
    return {
      ...user,
      role: agent.role,
      type: 'agent'
    }
  }

  // If not an agent, check if user is a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', user.id)
    .single()

  if (customer) {
    return {
      ...user,
      role: 'customer',
      type: 'customer'
    }
  }

  return null
} 