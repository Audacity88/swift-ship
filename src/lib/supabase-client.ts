import { createServerClient, createBrowserClient } from '@supabase/ssr'
import type { GetServerSidePropsContext } from 'next'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '@/types/supabase'

export type ServerContext = GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse } | undefined

let supabaseClient: ReturnType<typeof createServerClient> | ReturnType<typeof createBrowserClient> | null = null

export const getServerSupabase = (context?: ServerContext) => {
  // Return existing client if already initialized
  if (supabaseClient) {
    return supabaseClient
  }

  // If we're in a server context (have req/res), create a server client
  if (context?.req) {
    supabaseClient = createServerClient(
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
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        global: {
          headers: {
            'x-application-name': 'zendesk-clone'
          }
        }
      }
    )
  }

  return supabaseClient
} 