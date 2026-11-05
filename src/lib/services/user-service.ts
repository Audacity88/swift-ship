import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { ensureUserProfile } from '@/lib/auth/profile'
import { RoleType } from '@/types/role'

export interface User {
  id: string
  name: string
  email: string
  type: 'agent' | 'customer'
  role: RoleType
  company?: string
  avatar?: string
  phone?: string
}

const toUser = (row: { id: string; name: string; email: string; role?: RoleType; company?: string; avatar?: string; phone?: string }, type: 'agent' | 'customer'): User => ({
  id: row.id, name: row.name, email: row.email, type,
  role: type === 'customer' ? RoleType.CUSTOMER : row.role || RoleType.AGENT,
  company: row.company, avatar: row.avatar, phone: row.phone,
})

export const userService = {
  async getCurrentUser(context: ServerContext): Promise<User | null> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const profile = await ensureUserProfile(supabase, user)
    return toUser(profile, profile.type)
  },

  async getUserById(context: ServerContext, userId: string): Promise<User | null> {
    const supabase = getServerSupabase(context)
    const { data: agent, error: agentError } = await supabase.from('agents')
      .select('id, name, email, role, avatar').eq('id', userId).maybeSingle()
    if (agentError) throw agentError
    if (agent) return toUser(agent, 'agent')
    const { data: customer, error } = await supabase.from('customers')
      .select('id, name, email, company, avatar, phone').eq('id', userId).maybeSingle()
    if (error) throw error
    return customer ? toUser(customer, 'customer') : null
  },

  async searchUsers(context: ServerContext, searchTerm: string, type?: 'agent' | 'customer', excludeIds: string[] = []): Promise<User[]> {
    const supabase = getServerSupabase(context)
    const users: User[] = []
    for (const kind of ['agent', 'customer'] as const) {
      if (type && type !== kind) continue
      let query = supabase.from(kind === 'agent' ? 'agents' : 'customers').select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`).limit(10)
      if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      const { data, error } = await query
      if (error) throw error
      users.push(...(data || []).map(row => toUser(row, kind)))
    }
    return users
  },

  async checkUserExists(context: ServerContext, userId: string, type?: 'agent' | 'customer'): Promise<boolean> {
    const user = await this.getUserById(context, userId)
    return !!user && (!type || user.type === type)
  },

  async updateUser(context: ServerContext, userId: string, updates: Partial<User>): Promise<User | null> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')
    const { data: actor } = await supabase.from('agents').select('role').eq('id', user.id).maybeSingle()
    if (user.id !== userId && actor?.role !== 'admin') throw new Error('Unauthorized')
    const profile = await this.getUserById(context, userId)
    if (!profile) return null
    const allowed = profile.type === 'agent'
      ? { name: updates.name, avatar: updates.avatar }
      : { name: updates.name, avatar: updates.avatar, company: updates.company, phone: updates.phone }
    const { data, error } = await supabase.from(profile.type === 'agent' ? 'agents' : 'customers')
      .update({ ...allowed, updated_at: new Date().toISOString() }).eq('id', userId).select('*').maybeSingle()
    if (error) throw error
    return data ? toUser(data, profile.type) : null
  },

  async createCustomer(context: ServerContext, data: Partial<User>): Promise<User | null> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || (data.id && data.id !== user.id)) throw new Error('Unauthorized')
    const profile = await ensureUserProfile(supabase, user)
    return toUser(profile, profile.type)
  },
}
