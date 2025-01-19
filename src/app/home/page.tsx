'use client'

import { Package, ArrowRight, Plus, RefreshCw, Clock } from 'lucide-react'
import { COLORS } from '@/lib/constants'

const quickActions = [
  { label: 'New Shipment', icon: Plus },
  { label: 'Track Package', icon: Package },
  { label: 'Request Pickup', icon: RefreshCw },
]

const recentShipments = [
  {
    id: 'SHP001',
    destination: 'New York, USA',
    status: 'In Transit',
    date: '2024-01-19',
    eta: '2024-01-21',
  },
  {
    id: 'SHP002',
    destination: 'London, UK',
    status: 'Delivered',
    date: '2024-01-18',
    eta: '2024-01-20',
  },
  {
    id: 'SHP003',
    destination: 'Tokyo, Japan',
    status: 'Processing',
    date: '2024-01-19',
    eta: '2024-01-22',
  },
]

const activityFeed = [
  {
    id: 1,
    type: 'shipment',
    message: 'New shipment created to London',
    time: '2 hours ago',
  },
  {
    id: 2,
    type: 'quote',
    message: 'Quote #QT123 approved',
    time: '4 hours ago',
  },
  {
    id: 3,
    type: 'pickup',
    message: 'Pickup scheduled for tomorrow',
    time: '5 hours ago',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 \
              hover:border-primary hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5" style={{ color: COLORS.primary }} />
              </div>
              <span className="font-medium">{label}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Shipments</h2>
            <button className="text-sm text-primary font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {recentShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{shipment.id}</span>
                    <span className="text-sm text-gray-500">• {shipment.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>ETA: {shipment.eta}</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary">{shipment.status}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Feed */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Activity Feed</h2>
            <button className="text-sm text-primary font-medium">View All</button>
          </div>
          <div className="space-y-6">
            {activityFeed.map((activity) => (
              <div key={activity.id} className="flex gap-4">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="absolute top-3 bottom-0 left-1/2 w-px bg-gray-200 -translate-x-1/2" />
                </div>
                <div className="flex-1 pb-6">
                  <p className="text-gray-900">{activity.message}</p>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* News Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Latest Updates</h2>
          <button className="text-sm text-primary font-medium">All News</button>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600">
            Our new route optimization system has been deployed, resulting in 15% faster delivery times.
            Learn more about how this improvement affects your shipments.
          </p>
        </div>
      </section>
    </div>
  )
} 