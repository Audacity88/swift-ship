import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'
  const code_verifier = requestUrl.searchParams.get('code_verifier')

  if (!code || !code_verifier) {
    return NextResponse.redirect(new URL('/auth/auth-error?error=missing_code', requestUrl))
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    // Exchange the code for a session using PKCE
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/auth/auth-error?error=exchange_failed', requestUrl))
    }

    // Verify the user exists
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('User verification error:', userError)
      return NextResponse.redirect(new URL('/auth/auth-error?error=user_verification_failed', requestUrl))
    }

    // Clear PKCE parameters from cookies
    const response = NextResponse.redirect(new URL(next, requestUrl))
    response.cookies.set('code_verifier', '', { maxAge: 0 })
    response.cookies.set('code_challenge', '', { maxAge: 0 })

    return response
  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.redirect(new URL('/auth/auth-error?error=server_error', requestUrl))
  }
} 