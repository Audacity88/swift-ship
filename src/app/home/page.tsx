'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Shipment } from '@/types/shipment'
import { Package, Quote, MessageSquare, Clock } from 'lucide-react'
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

export default function HomePage() {
  const { user } = useAuth()
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([])
  const [shipmentsError, setShipmentsError] = useState(false)
  const [shipmentsLoading, setShipmentsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const load = async () => {
      const { data, error } = await createClient()
        .from('shipments').select('*').eq('customer_id', user.id)
        .order('created_at', { ascending: false }).limit(5)
      if (active) {
        setRecentShipments(data || [])
        setShipmentsError(!!error)
        setShipmentsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [user?.id])

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
          {shipmentsLoading ? <p className="text-muted-foreground">Loading shipments...</p> : shipmentsError ? <p role="alert">Could not load shipments. Open Shipments to retry.</p> : recentShipments.length > 0 ? (
            <div className="space-y-4">
              {recentShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className={cn(
                    "flex flex-wrap gap-2 items-center justify-between p-4 rounded-lg",
                    "border border-border",
                    "hover:bg-muted/50"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{shipment.tracking_number || shipment.id.slice(0, 8)}</span>
                      <span className="text-sm text-muted-foreground">• {shipment.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">ETA: {shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString() : 'Not scheduled'}</span>
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
          <p className="text-sm text-muted-foreground">No company updates have been published.</p>
        </section>
      </div>
    </div>
  )
} 