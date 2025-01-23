import { createServerClient } from '@supabase/ssr'
import type { GetServerSidePropsContext } from 'next'
import type { NextApiRequest, NextApiResponse } from 'next'

export type ServerContext = GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse } | undefined

let supabaseClient: ReturnType<typeof createServerClient> | null = null

export const getServerSupabase = (context?: ServerContext) => {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (context?.req?.cookies) {
            return context.req.cookies[name]
          }
          // Fallback to document.cookie in client context
          if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';')
            const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))
            return cookie ? cookie.split('=')[1] : undefined
          }
          return undefined
        },
        set(name: string, value: string, options: any) {
          if (context?.res) {
            context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
          } else if (typeof document !== 'undefined') {
            // Fallback to document.cookie in client context
            document.cookie = `${name}=${value}; Path=/; SameSite=Lax`
          }
        },
        remove(name: string, options: any) {
          if (context?.res) {
            context.res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
          } else if (typeof document !== 'undefined') {
            // Fallback to document.cookie in client context
            document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0`
          }
        },
      },
    }
  )

  return supabaseClient
} 