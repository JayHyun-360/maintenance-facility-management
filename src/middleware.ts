import { createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login, auth routes, and static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Get user role from JWT metadata (Circuit Breaker pattern)
  const jwt = session.access_token
  const payload = JSON.parse(atob(jwt.split('.')[1]))
  const userRole = payload.app_metadata?.role || 'user'

  // Route based on role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      // Redirect non-admins to user dashboard
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  } else if (pathname.startsWith('/dashboard')) {
    if (userRole === 'admin') {
      // Redirect admins to admin dashboard
      const adminUrl = new URL('/admin/dashboard', request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
