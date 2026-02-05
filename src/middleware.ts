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
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession instead of getUser for a faster initial check during login
  const { data: { session } } = await supabase.auth.getSession()

  // 1. PUBLIC ROUTE BYPASS
  if (request.nextUrl.pathname.startsWith('/terminal')) {
    return response
  }

  // 2. AUTHENTICATION CHECK
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. ROLE AUTHORIZATION (With error handling to prevent hanging)
  if (session && request.nextUrl.pathname === '/') {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      // If database is slow or profile missing, don't hang, just send to POS
      if (error || !profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
        return NextResponse.redirect(new URL('/pos', request.url))
      }
    } catch (e) {
      // Emergency fallback if the query itself crashes
      return NextResponse.redirect(new URL('/pos', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|terminal|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}