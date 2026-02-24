import { createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestUrl = new URL(request.url);

  // Allow access to login, auth routes, profile creation, welcome pages, reset password, and static files
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/profile-creation") ||
    pathname.startsWith("/welcome-") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession(); // Use getSession() for PKCE flow

  if (!session) {
    // Redirect to login if not authenticated (except for root page which handles client-side)
    if (pathname !== "/") {
      const loginUrl = new URL("/login", request.url);
      // Prevent redirect loops
      if (requestUrl.pathname !== "/login") {
        return NextResponse.redirect(loginUrl);
      }
    }
    return NextResponse.next();
  }

  // Get user role from app metadata (Circuit Breaker pattern)
  const userRole = session.user.app_metadata?.role || "user";

  // Handle root redirect for authenticated users
  if (pathname === "/") {
    const redirectUrl =
      userRole === "admin"
        ? new URL("/admin/dashboard", request.url)
        : new URL("/dashboard", request.url);
    // Prevent redirect loops
    if (requestUrl.pathname !== redirectUrl.pathname) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Route based on role
  if (pathname.startsWith("/admin")) {
    if (userRole !== "admin") {
      // Redirect non-admins to user dashboard
      const dashboardUrl = new URL("/dashboard", request.url);
      // Prevent redirect loops
      if (requestUrl.pathname !== "/dashboard") {
        return NextResponse.redirect(dashboardUrl);
      }
    }
  } else if (pathname.startsWith("/dashboard")) {
    if (userRole === "admin") {
      // Redirect admins to admin dashboard
      const adminUrl = new URL("/admin/dashboard", request.url);
      // Prevent redirect loops
      if (requestUrl.pathname !== "/admin/dashboard") {
        return NextResponse.redirect(adminUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
