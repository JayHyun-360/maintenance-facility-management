import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Get user and check role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ["/dashboard", "/admin/dashboard"];
  const adminRoutes = ["/admin/dashboard"];
  const publicRoutes = ["/login", "/auth/callback", "/auth/error"];
  const staticRoutes = ["/api", "/_next", "/favicon.ico"];

  // Skip middleware for static routes and public routes
  if (
    staticRoutes.some((route) => pathname.startsWith(route)) ||
    publicRoutes.some((route) => pathname.startsWith(route))
  ) {
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Check admin role for admin routes
  if (user && adminRoutes.some((route) => pathname.startsWith(route))) {
    // CRITICAL FIX: Use consistent role checking
    // Check both possible metadata locations for Admin role
    const userRole =
      user.app_metadata?.role === "Admin" ||
      user.user_metadata?.database_role === "Admin"
        ? "Admin"
        : "User";

    if (userRole !== "Admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard"; // Redirect regular users to user dashboard
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from login page
  if (user && pathname === "/login") {
    // CRITICAL FIX: Use consistent role checking
    // Check both possible metadata locations for Admin role
    const userRole =
      user.app_metadata?.role === "Admin" ||
      user.user_metadata?.database_role === "Admin"
        ? "Admin"
        : "User";
    const url = request.nextUrl.clone();
    url.pathname = userRole === "Admin" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - auth/callback (OAuth callback)
     * - static assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
