import { NextRequest, NextResponse } from 'next/server'
import { authService, userService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await Promise.resolve((await context.params))

    // Check authentication
    const supabase = getServerSupabase(undefined)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only allow users to access their own data
    if (user.id !== id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get user data
    const userData = await userService.getUserById(undefined, id)

    // If user not found in either agents or customers table, create a new customer
    if (!userData) {
      const newUser = await userService.createCustomer(undefined, {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email!,
        avatar: user.user_metadata?.avatar_url
      })

      return NextResponse.json(newUser)
    }

    return NextResponse.json(userData)
  } catch (error: any) {
    console.error('Error in users GET route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await Promise.resolve((await context.params))

    // Check authentication
    const supabase = getServerSupabase(undefined)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only allow users to update their own data
    if (user.id !== id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updates = await request.json()

    // Validate required fields
    if (!updates.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Update user data
    const updatedUser = await userService.updateUser(undefined, id, updates)
    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Error in users PUT route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
} 