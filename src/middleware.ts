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

// Define public assets that don't require authentication
const PUBLIC_ASSETS = [
  '/images/',
  '/fonts/',
  '/favicon.ico',
]

// Define routes that require authentication but not specific permissions
const DEFAULT_AUTHENTICATED_ROUTES = [
  '/',
  '/home',
  '/notifications',
  '/quote',
  '/portal',
  '/portal/profile',
  '/portal/tickets/new',
  '/portal/knowledge',
  '/inbox',
  '/search',
  '/upgrade',
  '/settings',
  '/settings/profile',
  '/settings/notifications',
  '/settings/security',
  '/settings/billing',
  '/settings/preferences',
  '/shipments',
  '/pickup',
  '/shipments/[id]',
  '/pickup/[id]',
  '/tickets',
  '/tickets/[id]',
  '/tickets/overview',
  '/tickets/active',
  '/tickets/search',
  '/tickets/queue',
]

// Define routes that require customer permissions
const CUSTOMER_ROUTES = [
  '/portal/tickets/new',
  '/portal/knowledge/articles/[id]',
]

// Define routes that require agent permissions
const AGENT_ROUTES = [
  '/inbox/[id]',
  '/tickets',
  '/tickets/[id]',
  '/tickets/overview',
  '/tickets/active',
  '/tickets/search',
  '/tickets/queue',
  '/analytics/',
  '/analytics/[id]',
  '/knowledge',
  '/knowledge/[id]',
]

// Define routes that require admin permissions
const ADMIN_ROUTES = [
  '/agents',
  '/agents/[id]',
  '/teams',
  '/teams/[id]',
  '/admin',
  '/admin/[id]',
]

export async function middleware(request: NextRequest) {
  // Allow access to public assets without authentication
  const pathname = request.nextUrl.pathname
  if (PUBLIC_ASSETS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public') ||
    request.nextUrl.pathname === '/403' ||
    request.nextUrl.pathname === '/404' ||
    request.nextUrl.pathname === '/500'
  ) {
    return NextResponse.next()
  }

  // Initialize response
  let response = NextResponse.next()

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Verify auth status using getUser instead of getSession
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Require authentication for API routes except auth
  if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/auth')) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Clone the request headers and add the user ID for verification
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('X-User-Id', user.id)

    // Return a new response with the modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Allow access to public routes
  if (PUBLIC_ROUTES.includes(request.nextUrl.pathname)) {
    // If user is signed in and trying to access auth pages, redirect to home
    if (user && request.nextUrl.pathname.startsWith('/auth/') && request.nextUrl.pathname !== '/auth/signout') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return response
  }

  // Require authentication for all other routes
  if (!user) {
    // Don't redirect API routes, just return 401
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('id', user.id)
    .single()

  const isCustomer = !agent

  // If user is admin, allow access to everything
  if (agent?.role === 'admin') {
    return response
  }

  // Redirect customers to home page if trying to access dashboard
  if (isCustomer && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Allow access to default authenticated routes without permission check
  if (DEFAULT_AUTHENTICATED_ROUTES.some(route => {
    // Convert route pattern to regex to handle dynamic segments
    const pattern = route.replace(/\[.*?\]/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(request.nextUrl.pathname)
  })) {
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

  // If customer is trying to access agent/admin routes, deny access
  if (isCustomer && (isAgentRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/403', request.url))
  }

  // If agent is trying to access admin routes, deny access
  if (agent?.role === 'agent' && isAdminRoute) {
    return NextResponse.redirect(new URL('/403', request.url))
  }

  // Check route authorization for protected routes
  const isAuthorized = await isAuthorizedForRoute(request.nextUrl.pathname)
  if (!isAuthorized) {
    console.log(`Access denied to path: ${request.nextUrl.pathname}`)
    // Add the 403 page to public routes to prevent redirect loop
    if (!PUBLIC_ROUTES.includes('/403')) {
      PUBLIC_ROUTES.push('/403')
    }
    return NextResponse.redirect(
      new URL(`/403?path=${encodeURIComponent(request.nextUrl.pathname)}`, request.url)
    )
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