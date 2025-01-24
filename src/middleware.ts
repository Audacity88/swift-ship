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
    // Only check for root path
    if (request.nextUrl.pathname === '/') {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
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