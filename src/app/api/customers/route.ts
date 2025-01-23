import { NextResponse } from 'next/server'
import { authService, customerService } from '@/lib/services'
import type { Customer } from '@/types/customer'

// GET /api/customers - List customers or get a specific customer
export async function GET(request: Request, { params }: { params?: { id?: string } } = {}) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // If we have an ID parameter, get a specific customer
    if (params?.id) {
      const customer = await customerService.getCustomer(undefined, params.id)
      return NextResponse.json(customer)
    }

    // Otherwise, list customers with pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') as 'name' | 'email' | 'company' || 'name'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc'
    const searchTerm = searchParams.get('search') || undefined

    const result = await customerService.listCustomers(undefined, {
      page,
      limit,
      sortBy,
      sortOrder,
      searchTerm
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Failed to process customer request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process customer request' },
      { status: error.status || 500 }
    )
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await authService.getSession(undefined)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    const customer = await customerService.updateCustomer(undefined, params.id, updates)
    return NextResponse.json(customer)
  } catch (error: any) {
    console.error('Failed to update customer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: error.status || 500 }
    )
  }
}