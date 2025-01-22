import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { RoleType } from '@/types/role'

// Create admin client with service role key for admin operations
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // Create public client for user verification
    const cookieStore = await cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )
    
    // Get current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First check if user already exists in agents table
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (existingAgent) {
      // Update role to admin if not already using admin client
      if (existingAgent.role !== RoleType.ADMIN) {
        const { error: updateError } = await adminClient
          .from('agents')
          .update({
            role: RoleType.ADMIN,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating agent role:', updateError)
          return NextResponse.json(
            { error: 'Failed to update agent role' },
            { status: 500 }
          )
        }
      }
    } else {
      // Insert new agent with admin role using admin client
      const { error: insertError } = await adminClient
        .from('agents')
        .insert({
          id: user.id,
          role: RoleType.ADMIN,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error creating agent:', insertError)
        return NextResponse.json(
          { error: 'Failed to create agent' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 