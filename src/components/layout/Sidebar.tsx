'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Inbox, Quote, BarChart, Truck, Package, Settings } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const navItems = [
  { icon: Home, label: 'Home', href: ROUTES.dashboard },
  { icon: Inbox, label: 'Inbox', href: '/inbox' },
  { icon: Quote, label: 'Quote', href: '/quote' },
  { icon: BarChart, label: 'Analytics', href: ROUTES.analytics },
  { icon: Truck, label: 'Shipments', href: '/shipments' },
  { icon: Package, label: 'Pickup', href: '/pickup' },
  { icon: Settings, label: 'Settings', href: ROUTES.settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Support Desk</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors \
                    ${isActive 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
} 