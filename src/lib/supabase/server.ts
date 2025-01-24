import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async get(name: string) {
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle the cookies.set error in development
          }
        },
        async remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle the cookies.delete error in development
          }
        },
      },
    }
  )
} 