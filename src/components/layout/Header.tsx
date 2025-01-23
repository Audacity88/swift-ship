'use client'

import { Search, Bell, ChevronDown, Plus, LayoutGrid, LayoutList, LogOut, Settings as SettingsIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { COLORS } from '@/lib/constants'
import { useNotificationStore } from '@/lib/store/notifications'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useSearch } from '@/lib/hooks/useSearch'
import { useTicketStore } from '@/lib/store/tickets'
import { useViewMode } from '@/lib/store/viewMode'
import { SearchResult } from '@/types/search'
import { Ticket, TicketStatus, TicketPriority } from '@/types/ticket'
import { useAuth } from '@/lib/hooks/useAuth'

export function Header() {
  const { getUnreadCount } = useNotificationStore()
  const { searchTickets, results } = useSearch()
  const { createTicket } = useTicketStore()
  const { viewMode, setViewMode } = useViewMode()
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const unreadCount = getUnreadCount()
  const pathname = usePathname() || ''
  const router = useRouter()
  const isTicketRoute = pathname.startsWith('/tickets')
  const { user, signOut } = useAuth()

  useEffect(() => {
    setMounted(true)

    // Close menus when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debouncedSearch) {
      handleSearch()
    }
  }, [debouncedSearch])

  const handleSearch = async () => {
    if (!debouncedSearch) return
    setIsSearching(true)
    await searchTickets(debouncedSearch)
    setIsSearching(false)
  }

  const handleCreateTicket = async () => {
    const ticket = await createTicket({
      title: '',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
    })
    if (ticket) {
      router.push(`/tickets/${ticket.id}`)
    }
  }

  const handleSignOut = async () => {
    try {
      // First clear any UI state
      setShowProfileMenu(false)
      
      // Sign out using the auth hook
      const success = await signOut()
      if (!success) {
        console.error('Failed to sign out')
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex-1 max-w-lg" ref={searchRef}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isSearching ? 'text-primary' : 'text-gray-400'}`} />
          {mounted ? (
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTicketRoute ? "Search tickets..." : "Search..."}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg \
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <div className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
          )}
          {isSearching && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result) => (
                    <Link
                      key={result.items[0].id}
                      href={`/tickets/${result.items[0].id}`}
                      className="flex items-start gap-3 px-4 py-2 hover:bg-gray-50"
                      onClick={() => setIsSearching(false)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.items[0].title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {result.items[0].status} • {result.items[0].priority}
                        </p>
                      </div>
                      {result.metadata.executionTimeMs < 100 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Fast match
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : isSearching ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  Searching...
                </div>
              ) : (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {isTicketRoute && (
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
        )}
        
        {!isTicketRoute && (
          <Link
            href="/settings/subscription"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg \
              hover:bg-primary/90 transition-colors"
            style={{ backgroundColor: COLORS.primary }}
          >
            Upgrade Now
          </Link>
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
        
        <div className="relative" ref={profileMenuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100">
              <Image
                src={user?.avatar || "/images/default-avatar.png"}
                alt={user?.name || "Profile"}
                width={32}
                height={32}
                className="object-cover"
                priority
                unoptimized
              />
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowProfileMenu(false)}
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Link>
              <div className="h-px bg-gray-200 my-1" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 