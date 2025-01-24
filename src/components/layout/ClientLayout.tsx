'use client'

import { useEffect } from 'react'
import { useTheme } from '@/lib/hooks/useTheme'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        <main className={cn(
          "flex-1 overflow-auto p-6",
          "bg-background"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
} 