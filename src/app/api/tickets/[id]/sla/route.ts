import { NextResponse } from 'next/server'
import { slaService } from '@/lib/services/sla-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const slaState = await slaService.getSLAState(ticketId)
    
    return NextResponse.json(slaState)
  } catch (error) {
    console.error('Error fetching SLA state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SLA state' },
      { status: 500 }
    )
  }
} 