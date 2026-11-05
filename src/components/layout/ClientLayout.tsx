'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'
import { useAuth } from '@/lib/hooks/useAuth'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const { user, error } = useAuth()
  const pathname = usePathname() || '/'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isAuthPage = pathname.startsWith('/auth/') || pathname.startsWith('/portal/auth/')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  if (!isAuthPage && error) {
    return <main className="mx-auto max-w-lg space-y-4 p-6"><p role="alert" className="text-destructive">{error}</p><Link className="text-primary underline" href="/auth/signin?error=profile_missing">Return to sign in</Link></main>
  }

  if (isAuthPage || !user) {
    return <main className="min-h-dvh w-full min-w-0 bg-background">{children}</main>
  }

  return (
    <div className="flex h-dvh w-full min-w-0 overflow-hidden bg-background">
      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        id="app-navigation"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto transition-transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'}`}
      >
        <button
          aria-label="Close navigation"
          className="absolute right-2 top-2 rounded p-2 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center border-b">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
            aria-controls="app-navigation"
            className="ml-2 rounded p-2 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Header />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
