import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorizedForRoute } from '@/lib/auth/permissions'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/403', // Add error page to public routes
]

// Define routes that require authentication but not specific permissions
const DEFAULT_AUTHENTICATED_ROUTES = [
  '/',
  '/home',
  '/profile',
  '/notifications',
]

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/public') ||
    request.nextUrl.pathname.startsWith('/api/users') || // Skip auth check for user API
    request.nextUrl.pathname === '/403'
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getSession()

  // Allow access to public routes
  if (PUBLIC_ROUTES.includes(request.nextUrl.pathname)) {
    // If user is signed in and trying to access auth pages, redirect to home
    const { data: { session } } = await supabase.auth.getSession()
    if (session && request.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Allow access to default authenticated routes without permission check
  if (DEFAULT_AUTHENTICATED_ROUTES.includes(request.nextUrl.pathname)) {
    return response
  }

  // Check route authorization for protected routes
  const isAuthorized = await isAuthorizedForRoute(request.nextUrl.pathname)
  if (!isAuthorized) {
    return NextResponse.redirect(new URL('/403', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/home',
    '/inbox/:path*',
    '/quote/:path*',
    '/analytics/:path*',
    '/shipments/:path*',
    '/pickup',
    '/settings/:path*',
    '/search',
    '/notifications',
    '/profile',
    '/auth/:path*',
    '/403',
    '/api/:path*', // Match all API routes
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 