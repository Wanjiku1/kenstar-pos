import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session if it exists
  const { data: { user } } = await supabase.auth.getUser()

  // 1. PUBLIC ROUTE BYPASS
  // This allows staff to see the terminal without being logged in as a manager
  if (request.nextUrl.pathname.startsWith('/terminal')) {
    return response
  }

  // 2. PROTECTED ROUTE LOGIC
  // If no manager is logged in, send them to the login page
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - terminal (Ensures the matcher doesn't block the terminal)
     */
    '/((?!_next/static|_next/image|favicon.ico|terminal|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}