import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import { z } from 'zod'

// Define types for database responses
type AgentRole = {
  role: 'admin' | 'agent'
}

// Validation schema for creating/updating an agent
const agentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['agent', 'admin']),
  team_id: z.string().uuid().optional(),
  avatar_url: z.string().url().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single<AgentRole>()

    if (!currentAgent || currentAgent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the new agent data from request body
    const body = await request.json()
    const validatedData = agentSchema.parse(body)

    // Create auth user with password reset required
    const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      email_confirm: false,
      password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
      user_metadata: {
        name: validatedData.name,
        role: validatedData.role.toUpperCase(),
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
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
        team_id: validatedData.team_id,
        avatar_url: validatedData.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id
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
      email: validatedData.email,
    })

    if (resetError) {
      console.error('Failed to send password reset email:', resetError)
      // Don't return error as the agent was created successfully
    }

    return NextResponse.json(agent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single<AgentRole>()

    if (!currentAgent || currentAgent.role !== 'admin') {
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

export async function DELETE(request: Request) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single<AgentRole>()

    if (!currentAgent || currentAgent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
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