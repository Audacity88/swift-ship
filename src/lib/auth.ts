import { getServerSupabase } from '@/lib/supabase-client'
import type { GetServerSidePropsContext } from 'next'
import type { NextApiRequest, NextApiResponse } from 'next'

export async function auth(context?: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse }) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (err) {
    console.error('Auth error:', err)
    return null
  }
}

export async function getUser() {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (err) {
    console.error('Get user error:', err)
    return null
  }
}

export async function getUserRole() {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    if (agent) {
      return agent.role
    }

    return 'customer'
  } catch (err) {
    console.error('Get user role error:', err)
    return null
  }
}

export async function getUserPermissions() {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!agent) {
      return ['customer']
    }

    if (agent.role === 'admin') {
      return ['admin', 'agent', 'customer']
    }

    if (agent.role === 'agent') {
      return ['agent', 'customer']
    }

    return ['customer']
  } catch (err) {
    console.error('Get user permissions error:', err)
    return []
  }
} 