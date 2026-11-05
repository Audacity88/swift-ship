import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tickets/customer - Get tickets for the current customer
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tickets for the current customer
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at
      `)
      .eq('customer_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (ticketsError) {
      console.error('Error fetching customer tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error in GET /api/tickets/customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 