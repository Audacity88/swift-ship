'use client'

import Link from 'next/link'
import { Package, ArrowRight, Truck, Quote, MessageSquare, Clock } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

const quickLinks = [
  { 
    label: 'Get a Quote',
    description: 'Calculate shipping rates and get instant quotes',
    icon: Quote,
    href: ROUTES.quote,
    color: 'bg-blue-100 dark:bg-blue-900'
  },
  {
    label: 'Track Shipments',
    description: 'Track and manage your shipments',
    icon: Package,
    href: ROUTES.shipments,
    color: 'bg-green-100 dark:bg-green-900'
  },
  {
    label: 'Support',
    description: 'Get help from our support team',
    icon: MessageSquare,
    href: '/portal/tickets/new',
    color: 'bg-orange-100 dark:bg-orange-900'
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
    <div className={cn(
      "space-y-8 pb-8",
      "bg-background"
    )}>
      {/* Welcome Banner */}
      <section className={cn(
        "rounded-xl p-8",
        "bg-card text-card-foreground",
        "border border-border"
      )}>
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold mb-2">
            Welcome back, {user?.name || 'Valued Customer'}
          </h1>
          <p className="text-muted-foreground">
            Welcome to Swift Ship Express, your trusted partner in global logistics. 
            We&apos;re here to help you manage your shipments efficiently and provide you with 
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
            className={cn(
              "group block p-6 rounded-xl",
              "bg-card text-card-foreground",
              "border border-border",
              "hover:border-primary hover:shadow-sm transition-all"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
              color,
              "group-hover:bg-primary/10"
            )}>
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium mb-1">{label}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <section className={cn(
          "rounded-xl p-6",
          "bg-card text-card-foreground",
          "border border-border"
        )}>
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
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    "border border-border",
                    "hover:bg-muted/50"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shipment.id}</span>
                      <span className="text-sm text-muted-foreground">• {shipment.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">ETA: {shipment.eta}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary">{shipment.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent shipments found. Start shipping with us today!
            </p>
          )}
        </section>

        {/* Company Updates */}
        <section className={cn(
          "rounded-xl p-6",
          "bg-card text-card-foreground",
          "border border-border"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Company Updates</h2>
          </div>
          <div className="prose prose-sm max-w-none space-y-4 dark:prose-invert">
            <div className={cn(
              "p-4 rounded-lg",
              "bg-blue-100 dark:bg-blue-900",
              "text-blue-900 dark:text-blue-100"
            )}>
              <h3 className="font-medium mb-2">New Route Optimization</h3>
              <p>
                We&apos;ve enhanced our delivery network with AI-powered route optimization, 
                resulting in 15% faster delivery times across all major routes.
              </p>
            </div>
            <div className={cn(
              "p-4 rounded-lg",
              "bg-green-100 dark:bg-green-900",
              "text-green-900 dark:text-green-100"
            )}>
              <h3 className="font-medium mb-2">Sustainable Shipping Initiative</h3>
              <p>
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