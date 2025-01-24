import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7 // 7 days
}

export async function middleware(request: NextRequest) {
  // console.log('\n[Middleware] Starting middleware check for:', request.nextUrl.pathname)
  
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public')
  ) {
    // console.log('[Middleware] Skipping middleware for system path')
    return NextResponse.next()
  }

  // Create a response to modify its headers
  const response = NextResponse.next()

  // Create a new supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          // if (cookie?.value) {
          //   console.log('[Middleware] Found cookie:', name)
          // }
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          console.log('[Middleware] Setting cookie:', name)
          response.cookies.set({
            name,
            value,
            ...COOKIE_OPTIONS,
            ...options
          })
        },
        remove(name: string, options: any) {
          console.log('[Middleware] Removing cookie:', name)
          response.cookies.set({
            name,
            value: '',
            ...COOKIE_OPTIONS,
            ...options,
            maxAge: 0,
            expires: new Date(0)
          })
        },
      },
    }
  )

  try {
    // Check for session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    // console.log('[Middleware] Session check:', { hasSession: !!session, error: sessionError?.message })

    // Get user type early to use throughout middleware
    const { data: { user } } = await supabase.auth.getUser()
    const isCustomer = user?.user_metadata?.type === 'customer'

    // Handle auth pages
    if (request.nextUrl.pathname.startsWith('/auth/')) {
      // If we have a session on auth pages, redirect based on user type
      if (session && !request.nextUrl.pathname.startsWith('/auth/signout')) {
        const redirectUrl = isCustomer ? '/home' : '/'
        console.log('[Middleware] Authenticated user on auth page, redirecting to:', redirectUrl)
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
      console.log('[Middleware] Allowing access to auth page:', request.nextUrl.pathname)
      return response
    }

    // If no session and not on an auth page, redirect to sign in
    if (!session) {
      console.log('[Middleware] No authenticated session found, redirecting to sign in')
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check admin routes access
    if (request.nextUrl.pathname.startsWith('/admin/')) {
      if (isCustomer) {
        console.log('[Middleware] Customer attempting to access admin route, redirecting to home')
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Redirect customers to home page if trying to access dashboard
    if (request.nextUrl.pathname === '/') {
      if (isCustomer) {
        console.log('[Middleware] Customer attempting to access dashboard, redirecting to home')
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }

    console.log('[Middleware] User authenticated')
    return response
  } catch (err) {
    console.error('[Middleware] Error in auth check:', err)
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 