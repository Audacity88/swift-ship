import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 