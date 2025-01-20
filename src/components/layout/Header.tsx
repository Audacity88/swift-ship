'use client'

import { Search, Bell, ChevronDown, Plus, LayoutGrid, LayoutList } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { COLORS } from '@/lib/constants'
import { useNotificationStore } from '@/lib/store/notifications'

export function Header() {
  const { getUnreadCount } = useNotificationStore()
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const unreadCount = getUnreadCount()
  const pathname = usePathname()
  const isTicketRoute = pathname.startsWith('/tickets')

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {mounted ? (
            <input
              type="search"
              placeholder={isTicketRoute ? "Search tickets..." : "Search..."}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg \
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <div className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {isTicketRoute && (
          <>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg \
                hover:bg-primary/90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
            
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${
                  viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <LayoutList className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </>
        )}
        
        {!isTicketRoute && (
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg \
              hover:bg-primary/90 transition-colors"
            style={{ backgroundColor: COLORS.primary }}
          >
            Upgrade Now
          </button>
        )}
        
        <Link 
          href="/notifications"
          className="relative hover:text-primary transition-colors"
          style={{ '--hover-color': COLORS.primary } as React.CSSProperties}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {mounted && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full \
              text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>
        
        <button className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src="https://picsum.photos/200"
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  )
} 