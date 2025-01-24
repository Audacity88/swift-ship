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
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/hooks/useTheme'

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
  const { theme } = useTheme()

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
      setSearchQuery('')
      setIsSearching(false)
      
      // Sign out using the auth hook
      const success = await signOut()
      if (!success) {
        console.error('Failed to sign out')
        return
      }
      
      // The auth hook will handle the redirect
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className={cn(
      "h-16 border-b flex items-center justify-between px-6",
      "bg-background",
      "border-border"
    )}>
      <div className="flex-1 max-w-lg" ref={searchRef}>
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
            isSearching ? "text-primary" : "text-muted-foreground"
          )} />
          {mounted ? (
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTicketRoute ? "Search tickets..." : "Search..."}
              className={cn(
                "w-full pl-10 pr-4 py-2 text-sm rounded-lg",
                "bg-background border-border",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              )}
            />
          ) : (
            <div className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-muted" />
          )}
          {isSearching && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-lg shadow-lg border border-border max-h-96 overflow-y-auto">
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result) => (
                    <Link
                      key={result.items[0].id}
                      href={`/tickets/${result.items[0].id}`}
                      className="flex items-start gap-3 px-4 py-2 hover:bg-muted"
                      onClick={() => setIsSearching(false)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.items[0].title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.items[0].status} • {result.items[0].priority}
                        </p>
                      </div>
                      {result.metadata.executionTimeMs < 100 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                          Fast match
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : isSearching ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {isTicketRoute && (
          <div className="flex items-center gap-2 border rounded-lg p-1 border-border">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded",
                viewMode === 'list' ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <LayoutList className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded",
                viewMode === 'grid' ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
        
        {!isTicketRoute && !user?.isAgent && (
          <Link
            href="/settings/subscription"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors"
            )}
          >
            Upgrade Now
          </Link>
        )}
        
        <Link 
          href="/notifications"
          className="relative hover:text-primary transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {mounted && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>
        
        <div className="relative" ref={profileMenuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted">
              <Image
                className="h-8 w-8 rounded-full"
                width={32}
                height={32}
                src={user?.avatar || `/images/default-avatar.png`}
                alt={`${user?.name}'s profile picture`}
              />
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              showProfileMenu && "rotate-180"
            )} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-lg border border-border py-1 z-50">
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setShowProfileMenu(false)}
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Link>
              <div className="h-px bg-border my-1" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-muted"
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