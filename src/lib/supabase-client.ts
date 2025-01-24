import { createServerClient, createBrowserClient } from '@supabase/ssr'
import type { GetServerSidePropsContext } from 'next'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '@/types/supabase'

export type ServerContext = GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse } | undefined

// Remove singleton pattern to ensure fresh client on each call
export const getServerSupabase = (context?: ServerContext) => {
  // If we're in a server context (have req/res), create a server client
  if (context?.req) {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return context.req.cookies[name]
          },
          set(name: string, value: string, options: any) {
            if (context.res) {
              context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
            }
          },
          remove(name: string, options: any) {
            if (context.res) {
              context.res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
            }
          },
        },
      }
    )
  } 
  // If we're in a browser context, create a browser client
  else if (typeof window !== 'undefined') {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: 'sb-auth-token',
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          cookieOptions: {
            name: 'sb-auth-token',
            lifetime: 60 * 60 * 24 * 7, // 1 week
            domain: window.location.hostname,
            path: '/',
            sameSite: 'lax'
          }
        },
        global: {
          headers: {
            'x-application-name': 'zendesk-clone'
          }
        }
      }
    )
  }
  // If we're in a server environment without req/res (e.g. middleware), create a basic server client
  else {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return undefined // Cookie handling will be done by the middleware
          },
          set(name: string, value: string, options: any) {
            // Cookie handling will be done by the middleware
          },
          remove(name: string, options: any) {
            // Cookie handling will be done by the middleware
          },
        },
      }
    )
  }
} 