import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

interface Agent {
  id: string
  name: string
  email: string
}

export const agentService = {
  async searchAgents(context: ServerContext, excludeIds: string[] = []): Promise<Agent[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: agents, error } = await supabase
        .from('agents')
        .select('id, name, email')
        .not('id', 'in', `(${excludeIds.join(',')})`)

      if (error) throw error

      return agents || []
    } catch (error) {
      console.error('Error searching agents:', error)
      return []
    }
  }
} 