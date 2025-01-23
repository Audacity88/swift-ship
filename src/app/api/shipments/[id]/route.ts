import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: shipment, error } = await supabase
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
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching shipment:', error)
      return NextResponse.json(
        { error: 'Failed to fetch shipment' },
        { status: 500 }
      )
    }

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error in shipment GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const json = await request.json()
    const { status, location, notes } = json

    // Get the current user for the event creation
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update shipment status
    const { data: shipment, error: updateError } = await supabase
      .from('shipments')
      .update({ status })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating shipment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update shipment' },
        { status: 500 }
      )
    }

    // Create shipment event
    const { error: eventError } = await supabase
      .from('shipment_events')
      .insert({
        shipment_id: params.id,
        status,
        location,
        notes,
        created_by: user.id
      })

    if (eventError) {
      console.error('Error creating shipment event:', eventError)
      // Don't fail the request, but log the error
    }

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error in shipment PATCH route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // First delete related events
    const { error: eventsError } = await supabase
      .from('shipment_events')
      .delete()
      .eq('shipment_id', params.id)

    if (eventsError) {
      console.error('Error deleting shipment events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to delete shipment events' },
        { status: 500 }
      )
    }

    // Then delete the shipment
    const { error: shipmentError } = await supabase
      .from('shipments')
      .delete()
      .eq('id', params.id)

    if (shipmentError) {
      console.error('Error deleting shipment:', shipmentError)
      return NextResponse.json(
        { error: 'Failed to delete shipment' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in shipment DELETE route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 