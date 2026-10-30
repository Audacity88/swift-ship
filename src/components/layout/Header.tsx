'use client'

import { Search, Bell, ChevronDown, LayoutGrid, LayoutList, LogOut, Settings as SettingsIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useNotificationStore } from '@/lib/store/notifications'
import { useViewMode } from '@/lib/store/viewMode'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Header() {
  const { getUnreadCount } = useNotificationStore()
  const { viewMode, setViewMode } = useViewMode()
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      // First clear any UI state
      setShowProfileMenu(false)
      setSearchQuery('')
      
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
      "h-16 flex min-w-0 flex-1 items-center justify-between gap-3 px-3 sm:px-6",
      "bg-background",
      "border-border"
    )}>
      <form className="min-w-0 flex-1 max-w-lg" onSubmit={event => {
        event.preventDefault()
        if (searchQuery.trim()) router.push(`${user?.role === 'customer' ? '/portal/search' : '/tickets/search'}?q=${encodeURIComponent(searchQuery.trim())}`)
      }}>
        <div className="relative">
          <button type="submit" aria-label="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </button>
          <input
            type="search"
            aria-label={user?.role === 'customer' ? 'Search knowledge base' : 'Search tickets'}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={user?.role === 'customer' ? 'Search articles...' : 'Search tickets...'}
            className="w-full min-w-0 rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </form>
      
      <div className="flex shrink-0 items-center gap-3 sm:gap-6">
        {isTicketRoute && (
          <div className="hidden sm:flex items-center gap-2 border rounded-lg p-1 border-border">
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
        
        {!isTicketRoute && user?.role === 'customer' && (
          <Link
            href="/upgrade"
            className={cn(
              "hidden md:block px-4 py-2 text-sm font-medium rounded-lg",
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
                alt={`${user?.name || 'User'}'s profile picture`}
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
                href={user?.role === 'customer' ? '/portal/profile' : '/profile'}
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