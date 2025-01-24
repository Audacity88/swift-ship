import { createServerClient, createBrowserClient } from '@supabase/ssr'
import type { GetServerSidePropsContext } from 'next'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '@/types/supabase'

export type ServerContext = GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse } | undefined

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7 // 7 days
}

export const getBrowserSupabase = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  )
}

export const getServerSupabase = (context?: ServerContext) => {
  if (context?.req) {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        cookies: {
          get(name: string) {
            return context.req.cookies[name]
          },
          set(name: string, value: string, options: any) {
            if (context.res) {
              context.res.setHeader(
                'Set-Cookie',
                `${name}=${value}; ${Object.entries({
                  ...COOKIE_OPTIONS,
                  ...options,
                })
                  .map(([key, value]) => `${key}=${value}`)
                  .join('; ')}`
              )
            }
          },
          remove(name: string, options: any) {
            if (context.res) {
              context.res.setHeader(
                'Set-Cookie',
                `${name}=; ${Object.entries({
                  ...COOKIE_OPTIONS,
                  ...options,
                  maxAge: 0,
                  expires: new Date(0).toUTCString(),
                })
                  .map(([key, value]) => `${key}=${value}`)
                  .join('; ')}`
              )
            }
          },
        },
      }
    )
  }
  return getBrowserSupabase()
}