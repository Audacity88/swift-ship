'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext, useRef, type PropsWithChildren, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { getServerSupabase } from '@/lib/supabase-client'
import { useTheme } from '@/lib/hooks/useTheme'

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export default function Providers({ children }: PropsWithChildren) {
  const [isClient, setIsClient] = useState(false)
  const queryClientRef = useRef<QueryClient>()
  const supabaseClientRef = useRef<SupabaseClient<Database> | null>(null)
  const { theme } = useTheme()
  
  // Initialize clients only once on mount
  useEffect(() => {
    if (!queryClientRef.current) {
      queryClientRef.current = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
    }
    
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = getServerSupabase()
    }
    
    setIsClient(true)
  }, [])

  // Update theme class on document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Show nothing until we're on the client
  if (!isClient) {
    return null
  }

  return (
    <SupabaseContext.Provider value={supabaseClientRef.current}>
      <QueryClientProvider client={queryClientRef.current!}>
        {children}
      </QueryClientProvider>
    </SupabaseContext.Provider>
  )
} 