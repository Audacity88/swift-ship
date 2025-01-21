'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, Bell, Shield, CreditCard, Globe } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/useAuth'
import { RoleType } from '@/types/role'

interface SettingsNavItem {
  icon: React.ElementType
  label: string
  href: string
  roles?: RoleType[]
}

const navItems: SettingsNavItem[] = [
  { 
    icon: Users, 
    label: 'Profile Information', 
    href: ROUTES.settings.profile
  },
  { 
    icon: Bell, 
    label: 'Notifications', 
    href: ROUTES.settings.notifications
  },
  { 
    icon: Shield, 
    label: 'Security', 
    href: ROUTES.settings.security
  },
  { 
    icon: CreditCard, 
    label: 'Billing & Plans', 
    href: ROUTES.settings.billing
  },
  { 
    icon: Globe, 
    label: 'Preferences', 
    href: ROUTES.settings.preferences
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role || RoleType.CUSTOMER

  const isAllowed = (item: SettingsNavItem) => {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  return (
    <div className="flex gap-8 p-8">
      {/* Navigation Sidebar */}
      <div className="w-64">
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (!isAllowed(item)) return null
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg \
                  transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: '#0066FF' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
} 