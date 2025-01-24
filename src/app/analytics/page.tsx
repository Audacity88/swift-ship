'use client'

import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { Download, Filter, Calendar, BarChart3, Clock, Users, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { COLORS } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { subDays } from 'date-fns'

// Sample data for shipping charts
const shippingStats = [
  { label: 'Total Shipments', value: '3,640', change: '+12.5%' },
  { label: 'On-Time Delivery', value: '94.2%', change: '+2.3%' },
  { label: 'Average Transit Time', value: '2.4 days', change: '-0.5 days' },
  { label: 'Customer Rating', value: '4.6/5', change: '+0.2' },
]

// Sample data for charts
const monthlyShipments = [
  { month: 'Jan', tickets: 450 },
  { month: 'Feb', tickets: 380 },
  { month: 'Mar', tickets: 620 },
  { month: 'Apr', tickets: 520 },
  { month: 'May', tickets: 780 },
  { month: 'Jun', tickets: 890 },
]

const deliveryPerformance = [
  { date: '2024-01-13', resolved: 95, open: 5 },
  { date: '2024-01-14', resolved: 92, open: 8 },
  { date: '2024-01-15', resolved: 88, open: 12 },
  { date: '2024-01-16', resolved: 94, open: 6 },
  { date: '2024-01-17', resolved: 96, open: 4 },
  { date: '2024-01-18', resolved: 93, open: 7 },
  { date: '2024-01-19', resolved: 97, open: 3 },
]

const priorityData = [
  { name: 'Urgent', value: 45 },
  { name: 'High', value: 35 },
  { name: 'Medium', value: 20 },
  { name: 'Low', value: 15 },
]

const customerSatisfaction = [
  { month: 'Jan', score: 4.2 },
  { month: 'Feb', score: 4.3 },
  { month: 'Mar', score: 4.4 },
  { month: 'Apr', score: 4.3 },
  { month: 'May', score: 4.5 },
  { month: 'Jun', score: 4.6 },
]

const dateRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year', 'Custom']

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState('Last 30 days')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  // Fetch stats with date range
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['ticketStats', { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() }],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/stats?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`, {
        credentials: 'include'
      })
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

  const statsConfig = [
    {
      label: 'Open Tickets',
      value: (stats?.openTickets ?? 0).toString(),
      change: '+12%',
      icon: BarChart3,
      color: '#0052CC',
    },
    {
      label: 'Avg Response Time',
      value: stats?.avgResponseTime ?? '0h',
      change: '-30m',
      icon: Clock,
      color: '#00B8D9',
    },
    {
      label: 'Customer Satisfaction',
      value: `${stats?.customerSatisfaction ?? 0}%`,
      change: '+2%',
      icon: Users,
      color: '#36B37E',
    },
    {
      label: 'Total Conversations',
      value: (stats?.totalConversations ?? 0).toLocaleString(),
      change: '+15%',
      icon: MessageSquare,
      color: '#6554C0',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedRange}
            onChange={(e) => {
              setSelectedRange(e.target.value)
              // Update date range based on selection
              const now = new Date()
              switch (e.target.value) {
                case 'Last 7 days':
                  setDateRange({ from: subDays(now, 7), to: now })
                  break
                case 'Last 30 days':
                  setDateRange({ from: subDays(now, 30), to: now })
                  break
                case 'Last 90 days':
                  setDateRange({ from: subDays(now, 90), to: now })
                  break
                // Add other cases as needed
              }
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            {dateRanges.map((range) => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 \
            rounded-lg text-sm font-medium hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: COLORS.primary }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Shipping Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Shipping Analytics</h2>
        
        {/* Shipping Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {shippingStats.map((metric) => (
            <div key={metric.label} className="bg-white p-6 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">{metric.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-2xl font-semibold">{metric.value}</p>
                <span className={`text-sm font-medium ${
                  metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ticket Analytics</h2>
        
        {/* Ticket Metrics Grid */}
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
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Tickets */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Monthly Tickets</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyShipments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="tickets" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Performance */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Resolution Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deliveryPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stackId="1"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="open"
                  stackId="1"
                  stroke={COLORS.negative}
                  fill={COLORS.negative}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets by Priority */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Tickets by Priority</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={COLORS.negative} />
                  <Cell fill={COLORS.warning} />
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.success} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {priorityData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: [COLORS.negative, COLORS.warning, COLORS.primary, COLORS.success][index] }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Satisfaction Trend */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Customer Satisfaction Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerSatisfaction}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis domain={[3, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  dot={{ fill: COLORS.warning }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
} 