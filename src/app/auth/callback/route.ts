import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const requestedNext = url.searchParams.get('next') || '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'
  if (!code) return NextResponse.redirect(new URL('/auth/auth-error?error=missing_code', url))
  const destination = url.searchParams.get('type') === 'recovery' ? '/auth/update-password' : next
  const response = NextResponse.redirect(new URL(destination, url))
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: values => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.session) return NextResponse.redirect(new URL('/auth/auth-error?error=exchange_failed', url))
    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/auth-error?error=server_error', url))
  }
}
