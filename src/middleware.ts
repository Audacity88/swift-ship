import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
  maxAge: 60 * 60 * 24 * 7 // 7 days
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/callback',
  '/auth/auth-error'
]

export async function middleware(request: NextRequest) {
  // Create a response to modify its headers
  const response = NextResponse.next()

  // Handle favicon.ico requests immediately
  if (request.nextUrl.pathname === '/favicon.ico') {
    return new NextResponse(null, { status: 200 })
  }

  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public')
  ) {
    return response
  }

  // Check if the path is public
  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    return response
  }

  try {
    // Create a new supabase client with cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)
            return cookie?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...COOKIE_OPTIONS,
              ...options
            })
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...COOKIE_OPTIONS,
              ...options,
              maxAge: 0
            })
          },
        },
      }
    )

    // Check for session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Middleware] Session error:', sessionError)
      throw sessionError
    }

    // If no session, redirect to sign in
    if (!session) {
      console.log('[Middleware] No session found, redirecting to signin')
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Get user data for role-based access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('[Middleware] User error:', userError)
      throw userError
    }

    const isCustomer = user?.user_metadata?.type === 'customer'

    // Handle auth pages for authenticated users
    if (request.nextUrl.pathname.startsWith('/auth/')) {
      if (!request.nextUrl.pathname.startsWith('/auth/signout')) {
        const redirectUrl = isCustomer ? '/home' : '/'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
      return response
    }

    // Check admin routes access
    if (request.nextUrl.pathname.startsWith('/admin/') && isCustomer) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Redirect customers to home page if trying to access dashboard
    if (request.nextUrl.pathname === '/' && isCustomer) {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    return response
  } catch (err) {
    console.error('[Middleware] Auth error:', err)
    
    // Clear any existing auth cookies on error
    const cookiesToClear = ['sb-access-token', 'sb-refresh-token']
    cookiesToClear.forEach(name => {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        maxAge: 0
      })
    })

    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    redirectUrl.searchParams.set('error', 'auth_error')
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 