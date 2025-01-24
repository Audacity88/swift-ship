import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Customer } from '@/types/customer'

interface ListCustomersParams {
  page?: number
  limit?: number
  sortBy?: 'name' | 'email' | 'company'
  sortOrder?: 'asc' | 'desc'
  searchTerm?: string
}

interface ListCustomersResponse {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const customerService = {
  async listCustomers(
    context: ServerContext,
    params: ListCustomersParams = {}
  ): Promise<ListCustomersResponse> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'name',
        sortOrder = 'asc',
        searchTerm
      } = params

      let query = supabase
        .from('customers')
        .select('id, name, email, company', { count: 'exact' })

      // Apply search if provided
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
      }

      // Add sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Add pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Failed to list customers:', error)
        throw error
      }

      return {
        customers: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: count ? Math.ceil(count / limit) : 0
        }
      }
    } catch (error) {
      console.error('Error in listCustomers:', error)
      throw error
    }
  },

  async getCustomer(context: ServerContext, customerId: string): Promise<Customer | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Use maybeSingle instead of single to handle not found case gracefully
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle()

      if (error) {
        console.error('Failed to get customer:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getCustomer:', error)
      throw error
    }
  },

  async updateCustomer(
    context: ServerContext,
    customerId: string,
    updates: Partial<Pick<Customer, 'name' | 'company'>>
  ): Promise<Customer> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update customer:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateCustomer:', error)
      throw error
    }
  }
} 