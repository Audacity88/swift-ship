import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/types/role'

export async function POST(request: NextRequest) {
  try {
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

    // Get current user to verify admin status
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: currentAgent, error: currentAgentError } = await supabase
      .from('agents')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (currentAgentError || !currentAgent || currentAgent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the new agent data from request body
    const body = await request.json()
    const { name, email, role } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create auth user with password reset required
    const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
      user_metadata: {
        name,
        role: role.toUpperCase(),
        isAgent: true
      },
      email_settings: {
        template: 'invite',
      }
    })

    if (createAuthError || !newAuthUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create agent record
    const { data: agent, error: createAgentError } = await supabase
      .from('agents')
      .insert({
        id: newAuthUser.user.id,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createAgentError) {
      // Cleanup: Delete the auth user if agent creation fails
      await supabase.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create agent record' },
        { status: 500 }
      )
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (resetError) {
      console.error('Failed to send password reset email:', resetError)
      // Don't return error as the agent was created successfully
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error in POST /api/agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Get current user to verify admin status
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: currentAgent, error: currentAgentError } = await supabase
      .from('agents')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (currentAgentError || !currentAgent || currentAgent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get all agents
    const { data: agents, error: getAgentsError } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (getAgentsError) {
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