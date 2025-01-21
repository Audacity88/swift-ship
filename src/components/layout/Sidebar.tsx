'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Inbox, Quote, BarChart, Truck, Package, Settings, Ticket, 
  ListChecks, Search, Users, MessageSquare, FileText, Bell, 
  ShoppingCart, UserCircle 
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { useTicketStore } from '@/lib/store/tickets'
import { useAuth } from '@/lib/hooks/useAuth'
import { RoleType, USER_ROLE_LABELS } from '@/types/role'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  roles?: RoleType[]
  badge?: () => number | undefined
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', href: ROUTES.dashboard },
  { 
    icon: MessageSquare, 
    label: 'Inbox', 
    href: ROUTES.inbox,
    badge: () => useTicketStore.getState().tickets.filter(t => !t.assigneeId).length
  },
  { icon: Quote, label: 'Quote', href: ROUTES.quote },
  { 
    icon: BarChart, 
    label: 'Analytics', 
    href: ROUTES.analytics,
    roles: [RoleType.ADMIN, RoleType.SUPERVISOR]
  },
  { icon: Truck, label: 'Shipments', href: ROUTES.shipments },
  { icon: Package, label: 'Pickup', href: ROUTES.pickup },
  { 
    icon: Settings, 
    label: 'Settings', 
    href: ROUTES.settings.root,
    roles: [RoleType.ADMIN]
  },
]

const ticketItems: NavItem[] = [
  { 
    icon: Ticket, 
    label: 'Overview', 
    href: `${ROUTES.tickets}/overview`,
    badge: () => useTicketStore.getState().tickets.length
  },
  { 
    icon: ListChecks, 
    label: 'Active Tickets', 
    href: `${ROUTES.tickets}/active`,
    badge: () => useTicketStore.getState().tickets.filter(t => t.status !== 'closed').length
  },
  { icon: Search, label: 'Search Tickets', href: `${ROUTES.tickets}/search` },
  { 
    icon: Users, 
    label: 'Team Queue', 
    href: `${ROUTES.tickets}/queue`,
    roles: [RoleType.AGENT, RoleType.ADMIN, RoleType.SUPERVISOR],
    badge: () => useTicketStore.getState().tickets.filter(t => t.assigneeId).length
  },
]

const quickAccessItems: NavItem[] = [
  { icon: Search, label: 'Search', href: ROUTES.search },
  { 
    icon: Bell, 
    label: 'Notifications', 
    href: ROUTES.notifications,
    badge: () => 0 // TODO: Implement notifications count
  },
  { icon: ShoppingCart, label: 'Upgrade', href: ROUTES.upgrade },
  { icon: UserCircle, label: 'Profile', href: ROUTES.profile },
]

export function Sidebar() {
  const pathname = usePathname() || '/'
  const { user } = useAuth()
  const role = user?.role || RoleType.CUSTOMER

  const isAllowed = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  const isActive = (href: string) => {
    if (href === ROUTES.dashboard) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 py-4">
        {navItems.map((item) => {
          if (!isAllowed(item)) return null
          const Icon = item.icon
          const active = isActive(item.href)
          const badge = item.badge?.()

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg \
                transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              style={active ? { backgroundColor: '#0066FF' } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {badge !== undefined && (
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \
                  ${active ? 'bg-white text-primary' : 'bg-gray-100 text-gray-600'}`}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Ticket Section */}
        <div className="pt-4">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase">
            Tickets
          </div>
          {ticketItems.map((item) => {
            if (!isAllowed(item)) return null
            const Icon = item.icon
            const active = isActive(item.href)
            const badge = item.badge?.()

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg \
                  transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={active ? { backgroundColor: '#0066FF' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {badge !== undefined && (
                  <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \
                    ${active ? 'bg-white text-primary' : 'bg-gray-100 text-gray-600'}`}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Quick Access */}
        <div className="pt-4">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase">
            Quick Access
          </div>
          {quickAccessItems.map((item) => {
            if (!isAllowed(item)) return null
            const Icon = item.icon
            const active = isActive(item.href)
            const badge = item.badge?.()

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg \
                  transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={active ? { backgroundColor: '#0066FF' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {badge !== undefined && (
                  <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \
                    ${active ? 'bg-white text-primary' : 'bg-gray-100 text-gray-600'}`}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      {user && (
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Online
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500 truncate capitalize">
              {USER_ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 