import { NextResponse } from 'next/server'
import { ShipmentStatus, ShipmentType } from '@/types/shipment'
import { shipmentService } from '@/lib/services'
import { getServerSupabase } from '@/lib/supabase-client'

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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()
    console.log('Received shipment creation request:', json)

    const { quote_id, type, origin, destination, scheduled_pickup, estimated_delivery } = json

    // Create shipment using the service
    const shipment = await shipmentService.createShipment(undefined, {
      quote_id,
      type,
      origin,
      destination,
      scheduled_pickup,
      estimated_delivery
    })

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error in shipments POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
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