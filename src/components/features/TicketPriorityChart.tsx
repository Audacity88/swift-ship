'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { COLORS } from '@/lib/constants'

const data = [
  { priority: 'Critical', tickets: 23, color: COLORS.negative },
  { priority: 'High', tickets: 45, color: COLORS.warning },
  { priority: 'Medium', tickets: 67, color: COLORS.primary },
  { priority: 'Low', tickets: 32, color: COLORS.success },
]

export function TicketPriorityChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barSize={40}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="priority"
          scale="point"
          padding={{ left: 20, right: 20 }}
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#666' }}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
        />
        <Bar 
          dataKey="tickets"
          radius={[4, 4, 0, 0]}
          data={data.map(item => ({
            ...item,
            fill: item.color
          }))}
        />
      </BarChart>
    </ResponsiveContainer>
  )
} 