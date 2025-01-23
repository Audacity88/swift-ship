import { NextRequest, NextResponse } from 'next/server'
import { authService, userService } from '@/lib/services'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await Promise.resolve((await context.params))

    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only allow users to access their own data
    if (session.user.id !== id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get user data
    const user = await userService.getUserById(undefined, id)

    // If user not found in either agents or customers table, create a new customer
    if (!user) {
      const newUser = await userService.createCustomer(undefined, {
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Unknown',
        email: session.user.email!,
        avatar: session.user.user_metadata?.avatar_url
      })

      return NextResponse.json(newUser)
    }

    return NextResponse.json(user)
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
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only allow users to update their own data
    if (session.user.id !== id) {
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