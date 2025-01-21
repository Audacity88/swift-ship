import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Await the params
    const { id } = await Promise.resolve(context.params)
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

    // First check if user exists in auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser || authUser.id !== id) {
      return NextResponse.json(
        { error: 'User not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get user's role and permissions from agents table
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('id, name, email, role, avatar')
      .eq('id', id)
      .single()

    // If no agent found (PGRST116) or other non-critical error, try customers table
    if (agentError?.code === 'PGRST116' || !agentData) {
      // Try customers table
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, avatar, company')
        .eq('id', id)
        .single()

      // If no customer found, create a new customer record
      if (customerError?.code === 'PGRST116' || !customerData) {
        // Create new customer record
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown',
            email: authUser.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating customer:', createError)
          return NextResponse.json(
            { error: 'Failed to create customer record' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          ...newCustomer,
          role: 'customer'
        })
      }

      // If customer found, return with role
      if (customerData) {
        return NextResponse.json({
          ...customerData,
          role: 'customer'
        })
      }

      // If customer error (not PGRST116), return 500
      if (customerError) {
        console.error('Error fetching customer:', customerError)
        return NextResponse.json(
          { error: 'Failed to fetch customer' },
          { status: 500 }
        )
      }
    }

    // If agent error (not PGRST116), return 500
    if (agentError && agentError.code !== 'PGRST116') {
      console.error('Error fetching agent:', agentError)
      return NextResponse.json(
        { error: 'Failed to fetch agent' },
        { status: 500 }
      )
    }

    // If agent found, return agent data
    if (agentData) {
      return NextResponse.json(agentData)
    }

    // Fallback 404 if somehow nothing was returned
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 