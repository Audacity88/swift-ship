import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'

export type ServerContext = 
  | GetServerSidePropsContext 
  | { req: NextApiRequest; res: NextApiResponse }

let supabaseClient: SupabaseClient | null = null

export function getServerSupabase(context?: ServerContext) {
  // If we already have a client instance, return it
  if (supabaseClient) {
    return supabaseClient
  }

  // For server-side requests with context
  if (context) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            return context.req.cookies[name]
          },
          set: (name, value) => {
            context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
          },
          remove: (name) => {
            context.res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
          }
        }
      }
    )
    supabaseClient = supabase
    return supabase
  }

  // For client-side requests
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  supabaseClient = supabase
  return supabase
} 