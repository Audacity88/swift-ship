import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface Agent {
  id: string
  name: string
  email: string
  avatar: string
  role: 'agent' | 'admin'
  created_at: string
  updated_at: string
}

export const agentService = {
  async fetchAgents() {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching agents:', error)
      throw error
    }

    return agents as Agent[]
  },

  async fetchAgent(id: string) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching agent:', error)
      throw error
    }

    return agent as Agent
  },

  async updateAgent(id: string, updates: Partial<Agent>) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating agent:', error)
      throw error
    }

    return agent as Agent
  }
} 