import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Allow access to auth pages and update-password page
  if (
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname === '/auth/update-password'
  ) {
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
    
    // If no user or error, check for recovery flow
    if (!user || userError) {
      const type = request.nextUrl.searchParams.get('type')
      const token = request.nextUrl.searchParams.get('token')
      const hasAccessToken = request.url.includes('#access_token=')

      // If we have a token, this is a password reset flow
      if (token) {
        return NextResponse.redirect(new URL('/auth/update-password', request.url))
      }

      // Allow access to update-password page with access token
      if (request.nextUrl.pathname === '/auth/update-password' && hasAccessToken) {
        return NextResponse.next()
      }

      // Handle recovery flow
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/update-password', request.url))
      }
      
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user needs to reset password
    if (user.user_metadata?.force_password_reset && !request.nextUrl.pathname.startsWith('/auth/update-password')) {
      return NextResponse.redirect(new URL('/auth/update-password', request.url))
    }

    // Only check for root path
    if (request.nextUrl.pathname === '/') {
      // Check if user is an agent
      const { data: agent } = await supabase
        .from('agents')
        .select('id, role')
        .eq('id', user.id)
        .single()

      // If user is not an agent, redirect to home
      if (!agent) {
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 