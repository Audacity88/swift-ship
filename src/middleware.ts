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

  // Log all cookies for debugging
  console.log('[Middleware] Current cookies:', 
    Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value?.substring(0, 20) + '...']))
  )

  // Create a new supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Only get the main auth cookie
          if (name.includes('.')) return undefined
          const cookie = request.cookies.get(name)
          console.log(`[Middleware] Getting cookie ${name}:`, cookie?.value?.substring(0, 20) + '...')
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          // Only set the main auth cookie
          if (name.includes('.')) return
          console.log(`[Middleware] Setting cookie ${name}`)
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            domain: request.nextUrl.hostname,
            maxAge: 60 * 60 * 24 * 7 // 1 week
          })
        },
        remove(name: string, options: any) {
          // Only remove the main auth cookie
          if (name.includes('.')) return
          console.log(`[Middleware] Removing cookie ${name}`)
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: -1,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            domain: request.nextUrl.hostname
          })
        },
      },
    }
  )

  try {
    // Get authenticated user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Try to get project ID from different sources
    let projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID

    // If not in env, try to extract from URL
    if (!projectId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Try the standard format first
      const standardMatch = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/(?:db|api)\.([^.]+)\.supabase\.(co|net|dev)/)
      if (standardMatch) {
        projectId = standardMatch[1]
      } else {
        // Try the direct project URL format
        const directMatch = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)
        if (directMatch) {
          projectId = directMatch[1]
        }
      }
    }

    // If still no project ID, try to get it from existing cookie
    if (!projectId) {
      const authCookie = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
      if (authCookie) {
        const cookieMatch = authCookie.name.match(/^sb-([^-]+)-auth-token/)
        if (cookieMatch) {
          projectId = cookieMatch[1]
          console.log('[Middleware] Extracted project ID from cookie:', projectId)
        }
      }
    }

    console.log('[Middleware] Debug info:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      projectId,
      allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...']))
    })

    // Find auth cookie even if we don't have project ID
    const authCookie = projectId 
      ? request.cookies.get(`sb-${projectId}-auth-token`)
      : request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

    console.log('[Middleware] Auth check result:', { 
      hasUser: !!user, 
      error: userError?.message,
      userId: user?.id,
      projectId,
      authCookieName: authCookie?.name,
      cookies: authCookie ? { 
        [authCookie.name]: authCookie.value.substring(0, 20) + '...'
      } : {}
    })

    // If no user or error, check for recovery flow
    if (!user || userError) {
      // Allow access to auth callback for token exchange
      if (request.nextUrl.pathname === '/auth/callback') {
        console.log('[Middleware] Allowing access to auth callback')
        return response
      }

      // Special case: Allow access to update-password page directly
      if (request.nextUrl.pathname === '/auth/update-password') {
        console.log('[Middleware] Allowing direct access to update password page')
        return response
      }

      // Allow access to other auth pages
      if (request.nextUrl.pathname.startsWith('/auth/')) {
        console.log('[Middleware] Allowing access to auth page')
        return response
      }

      // For all other routes, redirect to sign in
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      console.log('[Middleware] No user found, redirecting to:', redirectUrl.toString())
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

    console.log('[Middleware] User authenticated, allowing access to:', request.nextUrl.pathname)
    return response
  } catch (error) {
    console.error('[Middleware] Error:', error)
    // On error, redirect to sign in
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
} 