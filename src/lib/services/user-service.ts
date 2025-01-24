import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { User } from '@/types/user'

export const userService = {
  async getCurrentUser(context: ServerContext): Promise<User | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('Error getting current user:', error)
        return null
      }

      // Get user details from the database
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (dbError) {
        console.error('Error getting user data:', dbError)
        return null
      }

      return userData
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
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

  async updateUser(context: ServerContext, userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Only allow users to update their own data unless they're an admin
      if (user.id !== userId && user.role !== 'admin') {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateUser:', error)
      throw error
    }
  },

  async createCustomer(context: ServerContext, data: Partial<User>): Promise<User | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data: customer, error } = await supabase
        .from('users')
        .insert({
          ...data,
          role: 'customer',
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating customer:', error)
        throw error
      }

      return customer
    } catch (error) {
      console.error('Error in createCustomer:', error)
      throw error
    }
  }
} 