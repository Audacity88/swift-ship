import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { GetServerSidePropsContext } from 'next'
import { cookies } from 'next/headers'

export async function auth(context?: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse }) {
  const cookieStore = context ? {
    get(name: string) {
      return context.req.cookies[name]
    },
    set(name: string, value: string, options: any) {
      context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
    },
    remove(name: string, options: any) {
      context.res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    }
  } : {
    async get(name: string) {
      const cookieStore = await cookies()
      return cookieStore.get(name)?.value
    },
    async set(name: string, value: string, options: any) {
      const cookieStore = await cookies()
      cookieStore.set(name, value, options)
    },
    async remove(name: string, options: any) {
      const cookieStore = await cookies()
      cookieStore.delete(name)
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
} 