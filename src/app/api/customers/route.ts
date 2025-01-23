import { NextResponse } from 'next/server'
import { customerService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'
import type { Customer } from '@/types/customer'

// GET /api/customers - List customers
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the URL to get the customer ID from the path
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const customerId = pathParts[pathParts.length - 1]

    // If we have a valid UUID in the path, get a specific customer
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (customerId && uuidRegex.test(customerId)) {
      const customer = await customerService.getCustomer(undefined, customerId)
      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(customer)
    }

    // Otherwise, list customers with pagination and filtering
    const { searchParams } = url
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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
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