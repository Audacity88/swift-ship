import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'

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
    const supabase = getServerSupabase()

    // Exchange the code for a session
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

    // Check if this is a password reset flow
    if (type === 'recovery' || user.user_metadata?.force_password_reset) {
      return NextResponse.redirect(new URL('/auth/update-password', requestUrl))
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