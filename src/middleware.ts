import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  console.log('\n[Middleware] Starting middleware check for:', request.nextUrl.pathname)
  
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public')
  ) {
    console.log('[Middleware] Skipping middleware for system path')
    return NextResponse.next()
  }

  // Create a response to modify its headers
  const response = NextResponse.next()

  // Create a new supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[Middleware] Auth check result:', { 
      hasUser: !!user, 
      error: userError?.message,
      userId: user?.id,
      metadata: user?.user_metadata 
    })
    
    // If no user or error, check for recovery flow
    if (!user || userError) {
      // Allow access to auth callback for token exchange
      if (request.nextUrl.pathname === '/auth/callback') {
        console.log('[Middleware] Allowing access to auth callback')
        return NextResponse.next()
      }

      // Special case: Allow access to update-password page directly
      // We'll handle the token validation in the page component
      if (request.nextUrl.pathname === '/auth/update-password') {
        console.log('[Middleware] Allowing direct access to update password page')
        return NextResponse.next()
      }

      // Allow access to other auth pages
      if (request.nextUrl.pathname.startsWith('/auth/')) {
        console.log('[Middleware] Allowing access to auth page:', request.nextUrl.pathname)
        return NextResponse.next()
      }

      // Redirect to sign in for all other cases
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      console.log('[Middleware] Redirecting to sign in:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user needs to reset password
    if (user.user_metadata?.force_password_reset && !request.nextUrl.pathname.startsWith('/auth/update-password')) {
      console.log('[Middleware] Forcing password reset redirect')
      const updatePasswordUrl = new URL('/auth/update-password', request.url)
      updatePasswordUrl.searchParams.set('type', 'recovery')
      return NextResponse.redirect(updatePasswordUrl)
    }

    // Only check for root path
    if (request.nextUrl.pathname === '/') {
      // Check if user is an agent
      const { data: agent } = await supabase
        .from('agents')
        .select('id, role')
        .eq('id', user.id)
        .single()

      console.log('[Middleware] Root path agent check:', { hasAgent: !!agent, agentRole: agent?.role })

      // If user is not an agent, redirect to home
      if (!agent) {
        console.log('[Middleware] Non-agent user, redirecting to home')
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }

    console.log('[Middleware] Allowing access to protected route')
    return response
  } catch (error) {
    console.error('[Middleware] Error:', error)
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 