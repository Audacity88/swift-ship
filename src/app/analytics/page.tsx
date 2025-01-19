'use client'

import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { Download, Filter, Calendar } from 'lucide-react'
import { COLORS } from '@/lib/constants'

// Sample data for charts
const monthlyShipments = [
  { month: 'Jan', shipments: 450 },
  { month: 'Feb', shipments: 380 },
  { month: 'Mar', shipments: 620 },
  { month: 'Apr', shipments: 520 },
  { month: 'May', shipments: 780 },
  { month: 'Jun', shipments: 890 },
]

const deliveryPerformance = [
  { date: '2024-01-13', onTime: 95, delayed: 5 },
  { date: '2024-01-14', onTime: 92, delayed: 8 },
  { date: '2024-01-15', onTime: 88, delayed: 12 },
  { date: '2024-01-16', onTime: 94, delayed: 6 },
  { date: '2024-01-17', onTime: 96, delayed: 4 },
  { date: '2024-01-18', onTime: 93, delayed: 7 },
  { date: '2024-01-19', onTime: 97, delayed: 3 },
]

const revenueData = [
  { name: 'Express', value: 45000 },
  { name: 'Standard', value: 35000 },
  { name: 'Economy', value: 20000 },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Shipments', value: '3,640', change: '+12.5%' },
          { label: 'On-Time Delivery', value: '94.2%', change: '+2.3%' },
          { label: 'Average Transit Time', value: '2.4 days', change: '-0.5 days' },
          { label: 'Customer Rating', value: '4.6/5', change: '+0.2' },
        ].map((metric) => (
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Shipments */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Monthly Shipments</h3>
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
                <Bar dataKey="shipments" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Performance */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Delivery Performance</h3>
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
                  dataKey="onTime"
                  stackId="1"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="delayed"
                  stackId="1"
                  stroke={COLORS.negative}
                  fill={COLORS.negative}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Revenue by Service</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.warning} />
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
              {revenueData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: [COLORS.primary, COLORS.warning, COLORS.success][index] }}
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