import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'
  const code_verifier = requestUrl.searchParams.get('code_verifier')
  const type = requestUrl.searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-error?error=missing_code', requestUrl))
  }

  try {
    // Create a response to modify its headers
    const response = NextResponse.redirect(new URL(next, requestUrl))

    // Create a Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // If the cookie is being set, add it to the response
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              path: '/',
              domain: new URL(request.url).hostname
            })
          },
          remove(name: string, options: any) {
            // If the cookie is being removed, expire it
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              path: '/',
              domain: new URL(request.url).hostname
            })
          },
        },
      }
    )

    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/auth/auth-error?error=exchange_failed', requestUrl))
    }

    if (!session) {
      console.error('No session returned')
      return NextResponse.redirect(new URL('/auth/auth-error?error=no_session', requestUrl))
    }

    // Verify the user exists
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('User verification error:', userError)
      return NextResponse.redirect(new URL('/auth/auth-error?error=user_verification_failed', requestUrl))
    }

    // Check if this is a password reset flow
    if (type === 'recovery' || user.user_metadata?.force_password_reset) {
      return NextResponse.redirect(new URL('/auth/update-password', requestUrl))
    }

    // Clear PKCE parameters from cookies
    response.cookies.set('code_verifier', '', { maxAge: 0 })
    response.cookies.set('code_challenge', '', { maxAge: 0 })

    return response
  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.redirect(new URL('/auth/auth-error?error=server_error', requestUrl))
  }
} 