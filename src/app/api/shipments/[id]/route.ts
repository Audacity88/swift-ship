import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = context.params

    // Get shipment with all related data
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        *,
        customer:customer_id(*),
        quote:quote_id(*),
        tracking:tracking_info(*),
        documents:shipping_documents(*)
      `)
      .eq('id', id)
      .single()

    if (shipmentError) {
      console.error('Error fetching shipment:', shipmentError)
      return NextResponse.json(
        { error: 'Failed to fetch shipment' },
        { status: 500 }
      )
    }

    // Check if user has access to this shipment
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'
    const isCustomer = shipment.customer_id === user.id

    if (!isAdmin && !isCustomer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error in GET /api/shipments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = context.params
    const updates = await request.json()

    // Check if user has permission to update this shipment
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Update shipment
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating shipment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update shipment' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedShipment)
  } catch (error) {
    console.error('Error in PATCH /api/shipments/[id]:', error)
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
    const supabase = getServerSupabase()

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