'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Inbox, Quote, BarChart, Truck, Package, Settings, Ticket, 
  ListChecks, Search, Users, MessageSquare, FileText, Bell, 
  ShoppingCart, UserCircle, UserCog, UsersRound, LifeBuoy, Ship,
  Moon, Sun, BarChart2
} from 'lucide-react'
import { ROUTES, COLORS } from '@/lib/constants'
import { useTicketStore } from '@/lib/store/tickets'
import { useAuth } from '@/lib/hooks/useAuth'
import { RoleType, USER_ROLE_LABELS } from '@/types/role'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { useTheme } from '@/lib/hooks/useTheme'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string | ((user: any) => string)
  href: string
  roles?: RoleType[]
  badge?: () => number | undefined
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    href: '/',
  },
  {
    icon: Ticket,
    label: 'Tickets',
    href: '/tickets/active',
  },
  {
    icon: Quote,
    label: 'Quote',
    href: '/quote',
    roles: [RoleType.CUSTOMER],
  },
  {
    icon: FileText,
    label: 'Manage Quotes',
    href: '/quotes',
  },
  {
    icon: BarChart2,
    label: 'Analytics',
    href: '/analytics',
    roles: [RoleType.ADMIN],
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    roles: [RoleType.ADMIN],
  },
]

const quickAccessItems: NavItem[] = [
  { 
    icon: Inbox, 
    label: 'Inbox', 
    href: ROUTES.inbox,
    badge: () => useTicketStore.getState().tickets.filter(t => !t.assigneeId).length
  },
  { 
    icon: Bell, 
    label: 'Notifications', 
    href: ROUTES.notifications,
    badge: () => 0 // TODO: Implement notifications count
  },
  { 
    icon: ShoppingCart, 
    label: 'Upgrade', 
    href: ROUTES.upgrade,
    roles: [RoleType.CUSTOMER, RoleType.SUPERVISOR]
  },
  { 
    icon: Settings, 
    label: 'Settings', 
    href: ROUTES.settings.root
  },
]

export function Sidebar() {
  const pathname = usePathname() || '/'
  const { user } = useAuth()
  const role = user?.role || RoleType.CUSTOMER
  const { theme, toggleTheme } = useTheme()

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
    <div className={cn(
      "h-full flex flex-col border-r",
      "bg-white dark:bg-gray-900",
      "border-gray-200 dark:border-gray-800"
    )}>
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
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              style={active ? { backgroundColor: theme === 'dark' ? '#FFFFFF' : '#0066FF' } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{typeof item.label === 'function' ? item.label(user) : item.label}</span>
              {badge !== undefined && (
                <span className={cn(
                  "ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  active 
                    ? "bg-white dark:bg-gray-900 text-primary dark:text-white" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

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
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
                style={active ? { backgroundColor: theme === 'dark' ? '#FFFFFF' : '#0066FF' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{typeof item.label === 'function' ? item.label(user) : item.label}</span>
                {badge !== undefined && (
                  <span className={cn(
                    "ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    active 
                      ? "bg-white dark:bg-gray-900 text-primary dark:text-white" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  )}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* App Badge */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        <RainbowButton className="!h-9 !px-4 w-full" onClick={toggleTheme}>
          <div className="flex items-center gap-2 justify-center">
            <Ship className="w-5 h-5 text-white dark:text-black" />
            <span className="text-sm font-semibold text-white dark:text-black">Swift Ship</span>
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-white dark:text-black" />
            ) : (
              <Moon className="w-4 h-4 text-white dark:text-black" />
            )}
          </div>
        </RainbowButton>
      </div>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                Online
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
              {USER_ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 