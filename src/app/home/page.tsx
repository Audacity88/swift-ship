'use client'

import Link from 'next/link'
import { Package, ArrowRight, Truck, Quote, MessageSquare, Clock } from 'lucide-react'
import { COLORS, ROUTES } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/useAuth'

const quickLinks = [
  { 
    label: 'Get a Quote',
    description: 'Calculate shipping rates and get instant quotes',
    icon: Quote,
    href: ROUTES.quote,
    color: 'bg-blue-50'
  },
  {
    label: 'Track Shipments',
    description: 'Track and manage your shipments',
    icon: Package,
    href: ROUTES.shipments,
    color: 'bg-green-50'
  },
  {
    label: 'Schedule Pickup',
    description: 'Request a pickup for your packages',
    icon: Truck,
    href: ROUTES.pickup,
    color: 'bg-purple-50'
  },
  {
    label: 'Support',
    description: 'Get help from our support team',
    icon: MessageSquare,
    href: '/portal/tickets/new',
    color: 'bg-orange-50'
  }
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
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Banner */}
      <section className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold mb-2">
            Welcome back, {user?.name || 'Valued Customer'}
          </h1>
          <p className="text-gray-600">
            Welcome to Swift Ship Express, your trusted partner in global logistics. 
            We're here to help you manage your shipments efficiently and provide you with 
            the best shipping experience possible.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(({ label, description, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group block p-6 bg-white rounded-xl border border-gray-200 
              hover:border-primary hover:shadow-sm transition-all"
          >
            <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4 
              group-hover:bg-primary/10`}>
              <Icon className="w-6 h-6" style={{ color: COLORS.primary }} />
            </div>
            <h3 className="font-medium mb-1">{label}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Shipments</h2>
            <Link href={ROUTES.shipments} className="text-sm text-primary font-medium">
              View All
            </Link>
          </div>
          {recentShipments.length > 0 ? (
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
          ) : (
            <p className="text-gray-600 text-center py-8">
              No recent shipments found. Start shipping with us today!
            </p>
          )}
        </section>

        {/* Company Updates */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Company Updates</h2>
          </div>
          <div className="prose prose-sm max-w-none space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-blue-800 font-medium mb-2">New Route Optimization</h3>
              <p className="text-blue-700">
                We've enhanced our delivery network with AI-powered route optimization, 
                resulting in 15% faster delivery times across all major routes.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-green-800 font-medium mb-2">Sustainable Shipping Initiative</h3>
              <p className="text-green-700">
                Join our eco-friendly shipping program and help reduce carbon emissions 
                while enjoying premium shipping services.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
} 