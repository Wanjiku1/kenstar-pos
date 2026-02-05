import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. If we are going to login, let it happen! 
  // Returning NextResponse.next() stops the redirect loop.
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // For now, let's keep the proxy simple to see if we can just get the page to load.
  return NextResponse.next()
}