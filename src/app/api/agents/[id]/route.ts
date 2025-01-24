import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

// Validation schema for updating an agent
const updateAgentSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['agent', 'admin']),
  team_id: z.string().optional(),
  avatar: z.string().url().optional()
})

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the ID parameter first
    const { id } = await context.params

    // Create Supabase client with proper cookie handling
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies()
            return cookieStore.get(name)?.value
          },
          async set(name: string, value: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.set(name, value, { ...options })
            } catch (error) {
              console.error('Cookie set error:', error)
            }
          },
          async remove(name: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.delete(name)
            } catch (error) {
              console.error('Cookie remove error:', error)
            }
          },
        },
      }
    )

    // Get the current user using getUser() for security
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('User error:', userError)
      return NextResponse.json(
        { error: `Unauthorized - User error: ${userError.message}` },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
        { status: 401 }
      )
    }

    // Get user role
    const { data: currentAgent, error: roleError } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'agent' }>()

    if (roleError) {
      console.error('Role check error:', roleError)
      return NextResponse.json(
        { error: `Failed to verify role: ${roleError.message}` },
        { status: 500 }
      )
    }

    if (!currentAgent || currentAgent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the agent data from request body
    const body = await request.json()
    
    try {
      const validatedData = updateAgentSchema.parse(body)
      
      // Create admin client for user management
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Update auth user metadata if name or role changed
      if (validatedData.name || validatedData.role) {
        const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
          id,
          {
            user_metadata: {
              ...(validatedData.name && { name: validatedData.name }),
              ...(validatedData.role && { role: validatedData.role.toUpperCase() })
            }
          }
        )

        if (updateAuthError) {
          console.error('Update auth user error:', updateAuthError)
          return NextResponse.json(
            { error: `Failed to update user account: ${updateAuthError.message}` },
            { status: 500 }
          )
        }
      }

      // Update agent record using the regular client to maintain RLS policies
      const updateFields: Record<string, any> = {}
      if (validatedData.name) updateFields.name = validatedData.name
      if (validatedData.email) updateFields.email = validatedData.email
      if (validatedData.role) updateFields.role = validatedData.role
      if (validatedData.avatar) updateFields.avatar = validatedData.avatar

      const { data: agent, error: updateAgentError } = await supabase
        .from('agents')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single()

      if (updateAgentError) {
        console.error('Update agent record error:', updateAgentError)
        return NextResponse.json(
          { error: `Failed to update agent record: ${updateAgentError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json(agent)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      throw error // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Unexpected error in PUT /api/agents/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also add a GET endpoint to fetch a single agent
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the ID parameter first
    const { id } = await context.params

    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies()
            return cookieStore.get(name)?.value
          },
          async set(name: string, value: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.set(name, value, { ...options })
            } catch (error) {
              console.error('Cookie set error:', error)
            }
          },
          async remove(name: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.delete(name)
            } catch (error) {
              console.error('Cookie remove error:', error)
            }
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching agent:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agent' },
        { status: 500 }
      )
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error in GET /api/agents/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 