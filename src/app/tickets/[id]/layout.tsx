'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { 
  Info, Users, Tag, AlertCircle, Link as LinkIcon,
  History, FileText, UserCheck
} from 'lucide-react'

const tabItems = [
  { icon: Info, label: 'Details', href: '/details' },
  { icon: UserCheck, label: 'Assignee', href: '/assignee' },
  { icon: Users, label: 'Followers', href: '/followers' },
  { icon: Tag, label: 'Tags', href: '/tags' },
  { icon: FileText, label: 'Type', href: '/type' },
  { icon: AlertCircle, label: 'Priority', href: '/priority' },
  { icon: LinkIcon, label: 'Linked Problems', href: '/linked-problem' },
  { icon: History, label: 'History', href: '/history' },
]

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const ticketId = params.id as string

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabItems.map((item) => {
            const Icon = item.icon
            const href = `/tickets/${ticketId}${item.href}`
            const isActive = pathname === href

            return (
              <Link
                key={item.href}
                href={href}
                className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 \
                  transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                style={isActive ? { borderColor: '#0052CC', color: '#0052CC' } : {}}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  )
} 