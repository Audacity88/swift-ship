'use client'

import { BarChart3, Users, LineChart, Globe2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { TicketPriorityChart } from '@/components/features/TicketPriorityChart'
import { GeographicDistribution } from '@/components/features/GeographicDistribution'

const metrics = [
  {
    title: 'Customer Satisfaction',
    value: '98%',
    change: '+2.5%',
    icon: Users,
    color: COLORS.success
  },
  {
    title: 'Total Tickets',
    value: '1,234',
    change: '+12.3%',
    icon: BarChart3,
    color: COLORS.primary
  },
  {
    title: 'Response Time',
    value: '1.2h',
    change: '-0.5h',
    icon: LineChart,
    color: COLORS.warning
  },
  {
    title: 'Active Regions',
    value: '24',
    change: '+3',
    icon: Globe2,
    color: COLORS.negative
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        <div className="flex items-center gap-4">
          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: COLORS.primary }}>
            View Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${metric.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: metric.color }} />
                </div>
                <span className={`text-sm font-medium ${
                  metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-gray-900">{metric.value}</h3>
              <p className="mt-1 text-sm text-gray-600">{metric.title}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ticket Priority</h3>
          <div className="h-[300px]">
            <TicketPriorityChart />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
          <div className="h-[300px]">
            <GeographicDistribution />
          </div>
        </div>
      </div>
    </div>
  )
}
