import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorizedForRoute } from '@/lib/auth/permissions'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/403',
  '/404',
  '/500',
]

// Define routes that require authentication but not specific permissions
const DEFAULT_AUTHENTICATED_ROUTES = [
  '/',
  '/home',
  '/profile',
  '/notifications',
  '/quote',
  '/portal',
  '/portal/profile',
  '/portal/tickets',
  '/portal/knowledge',
  '/inbox',
  '/tickets',
  '/tickets/overview',
  '/tickets/active',
  '/tickets/search',
  '/tickets/queue',
  '/shipments',
  '/pickup',
  '/search',
  '/upgrade',
  '/analytics',
  '/settings',
  '/settings/roles',
  '/settings/teams',
  '/settings/users',
]

// Define routes that require customer permissions
const CUSTOMER_ROUTES = [
  '/portal/tickets/new',
  '/portal/tickets/[id]',
  '/portal/knowledge/articles/[id]',
]

// Define routes that require agent permissions
const AGENT_ROUTES = [
  '/inbox/[id]',
  '/tickets/[id]',
  '/analytics/[id]',
  '/shipments/[id]',
  '/pickup/[id]',
  '/teams/[id]',
  '/knowledge',
  '/knowledge/[id]',
]

// Define routes that require admin permissions
const ADMIN_ROUTES = [
  '/settings/roles/[id]',
  '/settings/teams/[id]',
  '/settings/users/[id]',
  '/admin',
  '/admin/[id]',
]

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/public') ||
    request.nextUrl.pathname === '/403' ||
    request.nextUrl.pathname === '/404' ||
    request.nextUrl.pathname === '/500'
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

  const { data: { session } } = await supabase.auth.getSession()

  // Require authentication for API routes except auth
  if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/auth')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return response
  }

  // Allow access to public routes
  if (PUBLIC_ROUTES.includes(request.nextUrl.pathname)) {
    // If user is signed in and trying to access auth pages, redirect to home
    if (session && request.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Require authentication for all other routes
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Allow access to default authenticated routes without permission check
  if (DEFAULT_AUTHENTICATED_ROUTES.includes(request.nextUrl.pathname)) {
    return response
  }

  // Check if the route is a customer route
  const isCustomerRoute = CUSTOMER_ROUTES.some(route => {
    // Convert route pattern to regex to handle dynamic segments
    const pattern = route.replace(/\[.*?\]/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(request.nextUrl.pathname)
  })

  // Check if the route is an agent route
  const isAgentRoute = AGENT_ROUTES.some(route => {
    const pattern = route.replace(/\[.*?\]/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(request.nextUrl.pathname)
  })

  // Check if the route is an admin route
  const isAdminRoute = ADMIN_ROUTES.some(route => {
    const pattern = route.replace(/\[.*?\]/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(request.nextUrl.pathname)
  })

  // Check route authorization for protected routes
  const isAuthorized = await isAuthorizedForRoute(request.nextUrl.pathname)
  if (!isAuthorized) {
    // Add the 403 page to public routes to prevent redirect loop
    if (!PUBLIC_ROUTES.includes('/403')) {
      PUBLIC_ROUTES.push('/403')
    }
    return NextResponse.redirect(new URL('/403', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ]
} 