import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
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

    // Get the email from query params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Create admin client for user management
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user by email
    const { data: users, error: getUserError } = await adminClient.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('Get user error:', getUserError)
      return NextResponse.json(
        { error: `Failed to get user: ${getUserError.message}` },
        { status: 500 }
      )
    }

    const userToDelete = users.users.find(u => u.email === email)
    
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      userToDelete.id
    )

    if (deleteError) {
      console.error('Delete user error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/auth/users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 