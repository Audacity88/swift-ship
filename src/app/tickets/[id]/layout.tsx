'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { 
  Info, Users, Tag, AlertCircle, Link as LinkIcon,
  History, FileText, UserCheck, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabItems = [
  { icon: Info, label: 'Details', href: '' },
  { icon: UserCheck, label: 'Assignee', href: '/assignee' },
  { icon: Users, label: 'Followers', href: '/followers' },
  { icon: Tag, label: 'Tags', href: '/tags' },
  { icon: FileText, label: 'Type', href: '/type' },
  { icon: AlertCircle, label: 'Priority', href: '/priority' },
  { icon: LinkIcon, label: 'Linked Problems', href: '/linked-problem' },
  { icon: History, label: 'History', href: '/history' },
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
]

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams() || {}
  const pathname = usePathname()
  const ticketId = (params.id as string) || ''

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto border-r border-gray-200 dark:border-gray-800">
        {children}
      </div>

      {/* Vertical Navigation Sidebar */}
      <div className={cn(
        "w-64 bg-gray-50 dark:bg-gray-900",
        "border-l border-gray-200 dark:border-gray-800"
      )}>
        <nav className="p-4 space-y-1">
          {tabItems.map((item) => {
            const Icon = item.icon
            const href = `/tickets/${ticketId}${item.href}`
            const isActive = pathname === href

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                style={isActive ? { color: '#0052CC' } : {}}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
} 