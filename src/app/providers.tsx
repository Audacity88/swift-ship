'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext, useRef, type PropsWithChildren } from 'react'
import type { SupabaseClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { getServerSupabase } from '@/lib/supabase-client'

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export default function Providers({ children }: PropsWithChildren) {
  // Use useRef to ensure stable reference across renders
  const supabaseClient = useRef<SupabaseClient<Database> | null>(null)
  
  // Initialize client only once using our singleton pattern
  if (!supabaseClient.current) {
    supabaseClient.current = getServerSupabase()
  }

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Ensure we have a client before rendering children
  if (!supabaseClient.current) {
    return null // or loading state
  }

  return (
    <SupabaseContext.Provider value={supabaseClient.current}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SupabaseContext.Provider>
  )
} 