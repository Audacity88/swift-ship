import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = new Set([
  '/auth/signin', '/auth/signup', '/auth/reset-password', '/auth/update-password',
  '/auth/callback', '/auth/auth-error', '/auth/confirm-email',
  '/portal/auth/register', '/portal/auth/reset-password', '/portal/auth/callback',
  '/403',
])
const matches = (path: string, root: string) => path === root || path.startsWith(`${root}/`)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (PUBLIC_PATHS.has(path) || path.startsWith('/api/') || path.startsWith('/articles/') || /\.[a-zA-Z0-9]+$/.test(path)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  const redirect = (destination: URL) => {
    const redirected = NextResponse.redirect(destination)
    response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie))
    return redirected
  }

  try {
    // Validate the user with Auth; session metadata is not a source of authority.
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('next', path)
      return redirect(url)
    }

    const { data: agent, error: roleError } = await supabase.from('agents')
      .select('role').eq('id', user.id).maybeSingle()
    if (roleError) throw roleError
    const staff = ['agent', 'admin', 'supervisor'].includes(agent?.role)
    const admin = agent?.role === 'admin'
    const adminOnly = ['/agents', '/teams', '/settings/agents', '/settings/roles', '/admin/setup']
      .some(root => matches(path, root))
    const staffOnly = ['/admin', '/settings', '/inbox', '/analytics', '/tickets/overview',
      '/tickets/active', '/tickets/queue', '/tickets/search'].some(root => matches(path, root))

    if ((adminOnly && !admin) || (staffOnly && !staff)) return redirect(new URL('/403', request.url))
    if (path === '/' && !staff) return redirect(new URL('/home', request.url))
    return response
  } catch {
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('next', path)
    url.searchParams.set('error', 'auth_error')
    return redirect(url)
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
