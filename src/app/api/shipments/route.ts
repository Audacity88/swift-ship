import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ShipmentStatus, ShipmentType } from '@/types/shipment'

const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        async set(name: string, value: string, options: any) {
          try {
            await cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Error setting cookie:', error)
          }
        },
        async remove(name: string, options: any) {
          try {
            await cookieStore.delete({ name, ...options })
          } catch (error) {
            console.error('Error removing cookie:', error)
          }
        },
      },
    }
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status') as ShipmentStatus
    const type = searchParams.get('type') as ShipmentType
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('shipments')
      .select(`
        *,
        customer:customer_id (
          id,
          email,
          raw_user_meta_data->name
        ),
        quote:quote_id (
          id,
          title,
          metadata
        ),
        events:shipment_events (
          id,
          status,
          location,
          notes,
          created_at,
          created_by
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data: shipments, error, count } = await query

    if (error) {
      console.error('Error fetching shipments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch shipments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      shipments,
      page,
      limit,
      total: count || 0
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
    const supabase = await createClient()
    const json = await request.json()
    console.log('Received shipment creation request:', json)

    const { quote_id, type, origin, destination, scheduled_pickup, estimated_delivery } = json

    // Verify the quote exists
    const { data: quote, error: quoteError } = await supabase
      .from('tickets')
      .select('id, customer_id, metadata, status')
      .eq('id', quote_id)
      .single()

    if (quoteError) {
      console.error('Error fetching quote:', quoteError)
      return NextResponse.json(
        { error: 'Quote not found or invalid', details: quoteError },
        { status: 404 }
      )
    }

    if (!quote) {
      console.error('Quote not found:', quote_id)
      return NextResponse.json(
        { error: 'Quote not found', quote_id },
        { status: 404 }
      )
    }

    // Generate tracking number
    const trackingNumber = generateTrackingNumber()

    // Extract destination info from quote metadata if not provided
    const quoteDestination = quote.metadata?.destination || {}
    
    const shipmentData = {
      quote_id,
      customer_id: quote.customer_id,
      type,
      status: 'quote_requested' as ShipmentStatus,
      origin: origin || quoteDestination.from || null,
      destination: destination || quoteDestination.to || null,
      scheduled_pickup: scheduled_pickup || (quoteDestination.pickupDate ? new Date(quoteDestination.pickupDate).toISOString() : null),
      estimated_delivery: estimated_delivery || null,
      tracking_number: trackingNumber,
      metadata: {
        quote_metadata: quote.metadata
      }
    }

    console.log('Creating shipment with data:', shipmentData)

    // Create the shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single()

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError)
      return NextResponse.json(
        { error: 'Failed to create shipment', details: shipmentError },
        { status: 500 }
      )
    }

    console.log('Shipment created successfully:', shipment)

    // Create initial shipment event
    const { error: eventError } = await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipment.id,
        status: 'quote_requested',
        notes: 'Quote request submitted',
        created_by: quote.customer_id
      })

    if (eventError) {
      console.error('Error creating shipment event:', eventError)
      // Don't fail the request, but log the error
    }

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