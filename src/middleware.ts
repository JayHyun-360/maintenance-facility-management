import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const publicRoutes = ["/login", "/auth/callback"];

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check admin role for admin routes
  if (user && adminRoutes.some((route) => pathname.startsWith(route))) {
    // Check JWT metadata first (most reliable), then fallback to user metadata
    const jwtRole = user.app_metadata?.role;
    const userRole =
      jwtRole === "admin"
        ? "Admin"
        : user.user_metadata?.database_role || user.user_metadata?.role;

    if (userRole !== "Admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard"; // Redirect regular users to user dashboard
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from login page
  if (user && pathname === "/login") {
    // Check JWT metadata first (most reliable), then fallback to user metadata
    const jwtRole = user.app_metadata?.role;
    const userRole =
      jwtRole === "admin"
        ? "Admin"
        : user.user_metadata?.database_role || user.user_metadata?.role;
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
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
