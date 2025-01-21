import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { RoleType } from '@/types/role'

const createClient = async (request: NextRequest) => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting error
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal error
          }
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request)
    
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First check if user already exists in agents table
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, role')
      .eq('id', session.user.id)
      .single()

    if (existingAgent) {
      // Update role to admin if not already
      if (existingAgent.role !== RoleType.ADMIN) {
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            role: RoleType.ADMIN,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id)

        if (updateError) {
          console.error('Error updating agent role:', updateError)
          return NextResponse.json(
            { error: 'Failed to update agent role' },
            { status: 500 }
          )
        }
      }
    } else {
      // Insert new agent with admin role
      const { error: insertError } = await supabase
        .from('agents')
        .insert({
          id: session.user.id,
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
    console.error('Error in POST /api/admin/setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 