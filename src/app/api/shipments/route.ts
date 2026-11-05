import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shipmentService } from '@/lib/services/shipment-service'
import { z } from 'zod'

const shipmentTypes = z.enum(['full_truckload', 'less_than_truckload', 'sea_container', 'bulk_freight'])
const shipmentStatuses = z.enum(['quote_requested', 'quote_provided', 'quote_accepted', 'pickup_scheduled', 'pickup_completed', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'])
const createShipmentSchema = z.object({
  quote_id: z.string().uuid().optional(),
  type: shipmentTypes,
  origin: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  scheduled_pickup: z.string().optional(),
  estimated_delivery: z.string().optional(),
  customer_id: z.string().uuid(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const parsed = z.object({
      customerId: z.string().uuid().optional(),
      status: shipmentStatuses.optional(),
      type: shipmentTypes.optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }).parse({
      customerId: searchParams.get('customer_id') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    // Use this request's authenticated client so every filter remains subject to RLS.
    let query = supabase.from('shipments').select('*', { count: 'exact' })
    if (parsed.customerId) query = query.eq('customer_id', parsed.customerId)
    if (parsed.status) query = query.eq('status', parsed.status)
    if (parsed.type) query = query.eq('type', parsed.type)
    const { data, error, count } = await query.order('created_at', { ascending: false })
      .range((parsed.page - 1) * parsed.limit, parsed.page * parsed.limit - 1)
    if (error) throw error
    return NextResponse.json({ shipments: data || [], page: parsed.page, limit: parsed.limit, total: count || 0 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid shipment filters' }, { status: 400 })
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const input = createShipmentSchema.parse(await request.json())
    const shipment = await shipmentService.createShipment(supabase, { ...input, status: 'quote_accepted' })
    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Enter valid shipment details', details: error instanceof z.ZodError ? error.flatten().fieldErrors : undefined }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not create the shipment. Check the customer and quote, then try again.' }, { status: 400 })
  }
}
