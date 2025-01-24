import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

// Define types for database responses
type AgentRole = {
  role: 'admin' | 'agent'
}

// Validation schema for creating/updating an agent
const agentSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['agent', 'admin']),
  team_id: z.string().optional(),
  avatar: z.string().url().optional()
})

export async function POST(request: NextRequest) {
  try {
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
      .single<AgentRole>()

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

    // Get the new agent data from request body
    const body = await request.json()
    
    try {
      const validatedData = agentSchema.parse(body)
      
      // Create admin client for user management
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      console.log('[CreateAgent] Inviting user:', {
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role
      })

      // Send invite email which will create the user
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`
      console.log('[CreateAgent] Sending invite email with redirect URL:', inviteUrl)

      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(validatedData.email, {
        redirectTo: inviteUrl,
        data: {
          name: validatedData.name,
          role: validatedData.role.toUpperCase(),
          isAgent: true,
          force_password_reset: true
        }
      })

      if (inviteError) {
        console.error('[CreateAgent] Error sending invite email:', inviteError)
        return NextResponse.json(
          { error: `Failed to invite user: ${inviteError.message}` },
          { status: 500 }
        )
      }

      if (!inviteData?.user) {
        console.error('[CreateAgent] No user returned from invite')
        return NextResponse.json(
          { error: 'Failed to invite user: No user returned' },
          { status: 500 }
        )
      }

      console.log('[CreateAgent] User invited successfully:', {
        userId: inviteData.user.id,
        metadata: inviteData.user.user_metadata
      })

      // Create agent record
      console.log('[CreateAgent] Creating agent record')
      const { data: agent, error: createAgentError } = await adminClient
        .from('agents')
        .insert({
          id: inviteData.user.id,
          name: validatedData.name,
          email: validatedData.email,
          role: validatedData.role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(validatedData.name.toLowerCase())}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createAgentError) {
        console.error('[CreateAgent] Create agent record error:', createAgentError)
        // Cleanup: Delete the auth user if agent creation fails
        await adminClient.auth.admin.deleteUser(inviteData.user.id)
        return NextResponse.json(
          { error: `Failed to create agent record: ${createAgentError.message}` },
          { status: 500 }
        )
      }

      console.log('[CreateAgent] Agent record created:', agent)
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
    console.error('Unexpected error in POST /api/agents:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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
              // Handle cookie setting error silently
            }
          },
          async remove(name: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.delete(name)
            } catch (error) {
              // Handle cookie removal error silently
            }
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error in GET /api/agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
              // Handle cookie setting error silently
            }
          },
          async remove(name: string, options: Record<string, unknown>) {
            try {
              const cookieStore = await cookies()
              cookieStore.delete(name)
            } catch (error) {
              // Handle cookie removal error silently
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

    // Verify the current user is an agent or admin
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single<AgentRole>()

    if (!currentAgent || !['admin', 'agent'].includes(currentAgent.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Agent or admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Delete agent record first
    const { error: deleteAgentError } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)

    if (deleteAgentError) {
      return NextResponse.json(
        { error: 'Failed to delete agent record' },
        { status: 500 }
      )
    }

    // Then delete auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError)
      // Don't return error as the agent record was deleted successfully
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 