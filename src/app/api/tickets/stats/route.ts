import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import { TicketPriority, TicketStatus } from '@/types/ticket'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TicketCount {
  type: 'priority' | 'status'
  key: string
  count: number
}

interface ResolutionTime {
  priority: string
  avg_hours: number
  min_hours: number
  max_hours: number
}

interface SLAStats {
  priority: string
  total: number
  response_breached: number
  resolution_breached: number
}

interface VolumeTrend {
  date: string
  created: number
  resolved: number
}

interface AgentMetrics {
  id: string
  name: string
  total_assigned: number
  total_resolved: number
  avg_resolution_hours: number
  sla_breaches: number
}

// GET /api/tickets/stats - Get ticket statistics
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('from')
    const endDate = searchParams.get('to')

    // Default response object
    const defaultResponse = {
      openTickets: 0,
      avgResponseTime: '0.0h',
      customerSatisfaction: 0,
      totalConversations: 0,
      detailedStats: {
        counts: {
          priority: {
            [TicketPriority.LOW]: 0,
            [TicketPriority.MEDIUM]: 0,
            [TicketPriority.HIGH]: 0,
            [TicketPriority.URGENT]: 0
          },
          status: {
            [TicketStatus.OPEN]: 0,
            [TicketStatus.IN_PROGRESS]: 0,
            [TicketStatus.RESOLVED]: 0,
            [TicketStatus.CLOSED]: 0
          }
        },
        resolutionTimes: {
          [TicketPriority.LOW]: { avg: 0, min: 0, max: 0 },
          [TicketPriority.MEDIUM]: { avg: 0, min: 0, max: 0 },
          [TicketPriority.HIGH]: { avg: 0, min: 0, max: 0 },
          [TicketPriority.URGENT]: { avg: 0, min: 0, max: 0 }
        },
        slaCompliance: {
          [TicketPriority.LOW]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
          [TicketPriority.MEDIUM]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
          [TicketPriority.HIGH]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
          [TicketPriority.URGENT]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 }
        },
        volumeTrends: [],
        agentMetrics: []
      }
    }

    // Get ticket counts
    const { data: ticketCounts, error: ticketCountsError } = await supabase
      .rpc('get_ticket_counts', {
        start_date: startDate,
        end_date: endDate
      })

    if (ticketCountsError) {
      console.error('Failed to get ticket counts:', ticketCountsError)
      return NextResponse.json(defaultResponse)
    }

    // Get resolution times
    const { data: resolutionTimes, error: resolutionTimesError } = await supabase
      .rpc('get_resolution_times', {
        start_date: startDate,
        end_date: endDate
      })

    if (resolutionTimesError) {
      console.error('Failed to get resolution times:', resolutionTimesError)
      return NextResponse.json(defaultResponse)
    }

    // Get SLA stats
    const { data: slaStats, error: slaStatsError } = await supabase
      .rpc('get_sla_stats', {
        start_date: startDate,
        end_date: endDate
      })

    if (slaStatsError) {
      console.error('Failed to get SLA stats:', slaStatsError)
      return NextResponse.json(defaultResponse)
    }

    // Get volume trends
    const { data: volumeTrends, error: volumeTrendsError } = await supabase
      .rpc('get_ticket_volume_trends', {
        start_date: startDate,
        end_date: endDate
      })

    if (volumeTrendsError) {
      console.error('Failed to get volume trends:', volumeTrendsError)
      return NextResponse.json(defaultResponse)
    }

    // Get agent metrics
    const { data: agentMetrics, error: agentMetricsError } = await supabase
      .rpc('get_agent_metrics', {
        start_date: startDate,
        end_date: endDate
      })

    if (agentMetricsError) {
      console.error('Failed to get agent metrics:', agentMetricsError)
      return NextResponse.json(defaultResponse)
    }

    // Calculate high-level stats
    const statusCounts = ticketCounts?.filter((count: TicketCount) => count.type === 'status')
      .reduce((acc: Record<string, number>, curr: TicketCount) => ({
        ...acc,
        [curr.key]: curr.count
      }), {}) || {}

    const avgResponseTime = resolutionTimes?.reduce((sum: number, curr: ResolutionTime) => 
      sum + (curr.avg_hours || 0), 0
    ) / (resolutionTimes?.length || 1)

    const customerSatisfaction = slaStats?.reduce((acc: number, curr: SLAStats) => {
      const total = curr.total || 1
      const satisfied = total - (curr.response_breached || 0) - (curr.resolution_breached || 0)
      return acc + (satisfied / total) * 100
    }, 0) / (slaStats?.length || 1)

    const totalConversations = volumeTrends?.reduce((sum: number, curr: VolumeTrend) => 
      sum + (curr.created || 0), 0
    ) || 0

    // Format the response
    const response = {
      openTickets: statusCounts['OPEN'] || 0,
      avgResponseTime: `${avgResponseTime?.toFixed(1) || '0.0'}h`,
      customerSatisfaction: Math.round(customerSatisfaction || 0),
      totalConversations: totalConversations || 0,
      detailedStats: {
        counts: {
          priority: ticketCounts?.filter((count: TicketCount) => count.type === 'priority')
            .reduce((acc: Record<string, number>, curr: TicketCount) => ({
              ...acc,
              [curr.key]: curr.count || 0
            }), defaultResponse.detailedStats.counts.priority),
          status: statusCounts || defaultResponse.detailedStats.counts.status
        },
        resolutionTimes: resolutionTimes?.reduce((acc: Record<string, any>, curr: ResolutionTime) => ({
          ...acc,
          [curr.priority]: {
            avg: curr.avg_hours || 0,
            min: curr.min_hours || 0,
            max: curr.max_hours || 0
          }
        }), defaultResponse.detailedStats.resolutionTimes),
        slaCompliance: slaStats?.reduce((acc: Record<string, any>, curr: SLAStats) => ({
          ...acc,
          [curr.priority]: {
            total: curr.total || 0,
            responseCompliance: ((curr.total - (curr.response_breached || 0)) / (curr.total || 1)) * 100,
            resolutionCompliance: ((curr.total - (curr.resolution_breached || 0)) / (curr.total || 1)) * 100
          }
        }), defaultResponse.detailedStats.slaCompliance),
        volumeTrends: volumeTrends?.map((trend: VolumeTrend) => ({
          date: trend.date,
          created: trend.created || 0,
          resolved: trend.resolved || 0
        })) || defaultResponse.detailedStats.volumeTrends,
        agentMetrics: agentMetrics?.map((agent: AgentMetrics) => ({
          id: agent.id,
          name: agent.name,
          metrics: {
            totalAssigned: agent.total_assigned || 0,
            totalResolved: agent.total_resolved || 0,
            avgResolutionTime: agent.avg_resolution_hours || 0,
            slaBreaches: agent.sla_breaches || 0
          }
        })) || defaultResponse.detailedStats.agentMetrics
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get ticket stats:', error)
    return NextResponse.json(
      {
        openTickets: 0,
        avgResponseTime: '0.0h',
        customerSatisfaction: 0,
        totalConversations: 0,
        detailedStats: {
          counts: {
            priority: {
              [TicketPriority.LOW]: 0,
              [TicketPriority.MEDIUM]: 0,
              [TicketPriority.HIGH]: 0,
              [TicketPriority.URGENT]: 0
            },
            status: {
              [TicketStatus.OPEN]: 0,
              [TicketStatus.IN_PROGRESS]: 0,
              [TicketStatus.RESOLVED]: 0,
              [TicketStatus.CLOSED]: 0
            }
          },
          resolutionTimes: {
            [TicketPriority.LOW]: { avg: 0, min: 0, max: 0 },
            [TicketPriority.MEDIUM]: { avg: 0, min: 0, max: 0 },
            [TicketPriority.HIGH]: { avg: 0, min: 0, max: 0 },
            [TicketPriority.URGENT]: { avg: 0, min: 0, max: 0 }
          },
          slaCompliance: {
            [TicketPriority.LOW]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
            [TicketPriority.MEDIUM]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
            [TicketPriority.HIGH]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 },
            [TicketPriority.URGENT]: { total: 0, responseCompliance: 0, resolutionCompliance: 0 }
          },
          volumeTrends: [],
          agentMetrics: []
        }
      }
    )
  }
} 