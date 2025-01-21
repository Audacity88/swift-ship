'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { 
  BarChart3, 
  Clock, 
  MessageSquare, 
  Users,
  Download,
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TicketList from '@/components/features/tickets/TicketList'
import { CreateTicketForm } from '@/components/features/tickets/CreateTicketForm'
import { fetchTickets, createTicket } from '@/lib/services/ticket-service'
import type { CreateTicketData } from '@/lib/services/ticket-service'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface DateRange {
  from: Date
  to: Date
}

interface TicketStats {
  openTickets: number
  avgResponseTime: string
  customerSatisfaction: number
  totalConversations: number
  detailedStats: {
    counts: {
      priority: Record<string, number>
      status: Record<string, number>
    }
    resolutionTimes: Record<string, { avg: number; min: number; max: number }>
    slaCompliance: Record<string, { total: number; responseCompliance: number; resolutionCompliance: number }>
    volumeTrends: Array<{ date: string; created: number; resolved: number }>
    agentMetrics: Array<{
      id: string
      name: string
      metrics: {
        totalAssigned: number
        totalResolved: number
        avgResolutionTime: number
        slaBreaches: number
      }
    }>
  }
}

export default function TicketsOverviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [isExporting, setIsExporting] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Fetch tickets with date range
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['tickets', dateRange],
    queryFn: () => fetchTickets({
      filters: {
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString()
      },
      pagination: {
        page: 1,
        pageSize: 10
      },
      sort: {
        field: 'createdAt',
        direction: 'desc'
      }
    })
  })

  // Fetch stats with date range
  const { data: stats, isLoading: isLoadingStats } = useQuery<TicketStats>({
    queryKey: ['ticketStats', { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() }],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/stats?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    // Add default data to prevent undefined
    placeholderData: {
      openTickets: 0,
      avgResponseTime: '0.0h',
      customerSatisfaction: 0,
      totalConversations: 0,
      detailedStats: {
        counts: {
          priority: {},
          status: {}
        },
        resolutionTimes: {},
        slaCompliance: {},
        volumeTrends: [],
        agentMetrics: []
      }
    }
  })

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true)
      const response = await fetch(
        `/api/tickets/export?format=${format}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      )
      
      if (!response.ok) throw new Error('Failed to export tickets')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets-export-${format === 'csv' ? 'spreadsheet.csv' : 'report.pdf'}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export tickets:', error)
      // TODO: Show error toast
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateTicket = async (data: CreateTicketData) => {
    try {
      // Log the incoming data
      console.log('Creating ticket with data:', data)

      // Validate required fields
      if (!data?.title) throw new Error('Title is required')
      if (!data?.description) throw new Error('Description is required')
      if (!data?.customerId) throw new Error('Customer is required')
      if (!data?.priority) throw new Error('Priority is required')

      // Clean up the data
      const cleanData: CreateTicketData = {
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        customerId: data.customerId,
        assigneeId: data.assigneeId?.trim() || undefined,
        tags: data.tags || [],
        metadata: data.metadata || {}
      }

      // Log the cleaned data
      console.log('Submitting cleaned ticket data:', cleanData)

      await createTicket(cleanData)
      
      toast({
        title: 'Success',
        description: 'Ticket created successfully',
      })
      setIsCreateDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ticket',
        variant: 'destructive',
      })
    }
  }

  const statsConfig = [
    {
      label: 'Open Tickets',
      value: stats?.openTickets.toString() || '0',
      change: '+12%',
      icon: BarChart3,
      color: '#0052CC',
    },
    {
      label: 'Avg Response Time',
      value: stats?.avgResponseTime || '0h',
      change: '-30m',
      icon: Clock,
      color: '#00B8D9',
    },
    {
      label: 'Customer Satisfaction',
      value: `${stats?.customerSatisfaction || 0}%`,
      change: '+2%',
      icon: Users,
      color: '#36B37E',
    },
    {
      label: 'Total Conversations',
      value: stats?.totalConversations.toLocaleString() || '0',
      change: '+15%',
      icon: MessageSquare,
      color: '#6554C0',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets Overview</h1>
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
              </DialogHeader>
              <CreateTicketForm 
                onSubmit={handleCreateTicket}
                onSuccess={() => {
                  router.refresh()
                }}
              />
            </DialogContent>
          </Dialog>

          <Select
            onValueChange={(value) => {
              const now = new Date()
              switch (value) {
                case '7d':
                  setDateRange({ from: subDays(now, 7), to: now })
                  break
                case '30d':
                  setDateRange({ from: subDays(now, 30), to: now })
                  break
                case '90d':
                  setDateRange({ from: subDays(now, 90), to: now })
                  break
              }
            }}
            defaultValue="7d"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // Refresh queries
              router.refresh()
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px]">
              <div className="grid gap-2">
                <Button
                  variant="ghost"
                  className="justify-start"
                  disabled={isExporting}
                  onClick={() => handleExport('csv')}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  disabled={isExporting}
                  onClick={() => handleExport('pdf')}
                >
                  Export as PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => {
          const Icon = stat.icon
          return (
            <div 
              key={stat.label} 
              className="bg-white p-6 rounded-xl border border-gray-200 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <Badge variant={stat.change.startsWith('+') ? 'default' : 'secondary'}>
                  {stat.change}
                </Badge>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-gray-900">{stat.value}</h3>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
          <Button
            variant="link"
            onClick={() => router.push('/tickets/queue')}
          >
            View all tickets
          </Button>
        </div>
        {isLoadingTickets ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <RefreshCw className="w-6 h-6 text-primary" />
            </div>
          </div>
        ) : (
          <TicketList 
            tickets={ticketsData?.data || []} 
            onTicketClick={handleTicketClick} 
          />
        )}
      </div>
    </div>
  )
} 