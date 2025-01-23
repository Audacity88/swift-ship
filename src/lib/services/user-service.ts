import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export interface User {
  id: string
  type: 'customer' | 'agent'
  email: string
  name: string
  company?: string
  avatar?: string
  role?: string
}

export const userService = {
  async getCurrentUser(context: ServerContext): Promise<User | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session?.user) return null

      // First check if user is an agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name')
        .eq('id', session.user.id)
        .single()

      if (agentData) {
        return {
          id: session.user.id,
          type: 'agent',
          email: session.user.email!,
          name: agentData.name,
        }
      }

      // If not an agent, check if user is a customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('id', session.user.id)
        .single()

      if (customerData) {
        return {
          id: session.user.id,
          type: 'customer',
          email: session.user.email!,
          name: customerData.name,
          company: customerData.company,
        }
      }

      return null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  async getUserById(context: ServerContext, userId: string): Promise<User | null> {
    try {
      const supabase = getServerSupabase(context)

      // First check if user is an agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, email')
        .eq('id', userId)
        .single()

      if (agentData) {
        return {
          id: agentData.id,
          type: 'agent',
          email: agentData.email,
          name: agentData.name,
        }
      }

      // If not an agent, check if user is a customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name, email, company')
        .eq('id', userId)
        .single()

      if (customerData) {
        return {
          id: customerData.id,
          type: 'customer',
          email: customerData.email,
          name: customerData.name,
          company: customerData.company,
        }
      }

      return null
    } catch (error) {
      console.error('Error getting user by ID:', error)
      return null
    }
  },

  async searchUsers(context: ServerContext, searchTerm: string, type?: 'agent' | 'customer', excludeIds: string[] = []): Promise<User[]> {
    try {
      const supabase = getServerSupabase(context)
      let users: User[] = []

      if (!type || type === 'agent') {
        const { data: agents, error: agentError } = await supabase
          .from('agents')
          .select('id, name, email')
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10)

        if (!agentError && agents) {
          users.push(...agents.map(agent => ({
            id: agent.id,
            type: 'agent' as const,
            email: agent.email,
            name: agent.name,
          })))
        }
      }

      if (!type || type === 'customer') {
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id, name, email, company')
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10)

        if (!customerError && customers) {
          users.push(...customers.map(customer => ({
            id: customer.id,
            type: 'customer' as const,
            email: customer.email,
            name: customer.name,
            company: customer.company,
          })))
        }
      }

      return users
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  },

  async checkUserExists(context: ServerContext, userId: string, type?: 'agent' | 'customer'): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)

      if (!type || type === 'agent') {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('id', userId)
          .single()

        if (agent) return true
      }

      if (!type || type === 'customer') {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('id', userId)
          .single()

        if (customer) return true
      }

      return false
    } catch (error) {
      console.error('Error checking user:', error)
      return false
    }
  },

  async createCustomer(
    context: ServerContext,
    data: {
      id: string
      name: string
      email: string
      company?: string
      avatar?: string
    }
  ): Promise<User> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          id: data.id,
          name: data.name,
          email: data.email,
          company: data.company,
          avatar: data.avatar,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: session.user.id,
          updated_by: session.user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create customer:', error)
        throw error
      }

      return {
        id: customer.id,
        type: 'customer',
        email: customer.email,
        name: customer.name,
        company: customer.company,
        avatar: customer.avatar
      }
    } catch (error) {
      console.error('Error in createCustomer:', error)
      throw error
    }
  },

  async updateUser(
    context: ServerContext,
    userId: string,
    updates: Partial<{
      name: string
      company: string
      avatar: string
      role: string
    }>
  ): Promise<User> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // First check if user is an agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('id', userId)
        .single()

      if (agentData) {
        const { data: updatedAgent, error } = await supabase
          .from('agents')
          .update({
            ...updates,
            updated_by: session.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (error) {
          console.error('Failed to update agent:', error)
          throw error
        }

        return {
          id: updatedAgent.id,
          type: 'agent',
          email: updatedAgent.email,
          name: updatedAgent.name,
          avatar: updatedAgent.avatar,
          role: updatedAgent.role
        }
      }

      // If not an agent, update customer
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update customer:', error)
        throw error
      }

      return {
        id: updatedCustomer.id,
        type: 'customer',
        email: updatedCustomer.email,
        name: updatedCustomer.name,
        company: updatedCustomer.company,
        avatar: updatedCustomer.avatar
      }
    } catch (error) {
      console.error('Error in updateUser:', error)
      throw error
    }
  }
} 