import { NextResponse } from 'next/server'
import { ShipmentStatus, ShipmentType } from '@/types/shipment'
import { shipmentService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status') as ShipmentStatus
    const type = searchParams.get('type') as ShipmentType
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch shipments using the service
    const { shipments, total } = await shipmentService.listShipments(undefined, {
      customerId: customerId || undefined,
      status,
      type,
      page,
      limit
    })

    return NextResponse.json({
      shipments,
      page,
      limit,
      total
    })
  } catch (error) {
    console.error('Error in shipments GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting shipment creation...')
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            console.log('Cookie retrieved:', { name, value: cookie?.value })
            return cookie?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    console.log('Supabase client created')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Auth check result:', { user: user?.id, error: userError?.message })
    
    if (userError || !user) {
      console.log('Authentication failed:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    console.log('Received shipment creation request:', json)

    const { quote_id, type, origin, destination, scheduled_pickup, estimated_delivery, customer_id } = json

    // Validate required fields
    if (!type || !origin || !destination || !customer_id) {
      console.error('Missing required fields:', { type, origin, destination, customer_id })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create shipment using the service with server context
    try {
      const shipment = await shipmentService.createShipment(supabase, {
        quote_id,
        type,
        origin,
        destination,
        scheduled_pickup,
        estimated_delivery,
        customer_id,
        status: 'quote_accepted'
      })
      return NextResponse.json(shipment)
    } catch (serviceError) {
      console.error('Service error creating shipment:', serviceError)
      return NextResponse.json(
        { error: serviceError instanceof Error ? serviceError.message : 'Failed to create shipment', details: serviceError },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in shipments POST route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

// Helper function to generate tracking number
function generateTrackingNumber(): string {
  const prefix = 'SSE'
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `${prefix}-${year}-${random}`
} 