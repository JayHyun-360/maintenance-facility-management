import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") || "/";

  console.log("=== SERVER-SIDE OAUTH ROUTE HANDLER ===");
  console.log("Full URL:", request.url);
  console.log("Code:", code);
  console.log("Error:", error);
  console.log("Error Description:", errorDescription);

  // If there's an error, redirect to error page
  if (error) {
    console.error("OAuth error from server:", error, errorDescription);
    const errorParams = new URLSearchParams({
      error: error || "oauth_error",
      error_description: errorDescription || "OAuth authentication failed",
    });
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }

  if (!code) {
    console.error("No OAuth code found in callback");
    const errorParams = new URLSearchParams({
      error: "no_code",
      error_description: "No authentication code found in callback",
    });
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }

  try {
    console.log("Creating server client for OAuth exchange...");
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            cookieStore.delete({
              name,
              ...options,
            });
          },
        },
      },
    );

    // Exchange the code for a session
    console.log("Exchanging code for session...");
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Server-side code exchange error:", exchangeError);
      console.error("Error details:", JSON.stringify(exchangeError, null, 2));

      // Redirect to error page with detailed error information
      const errorParams = new URLSearchParams({
        error: exchangeError.code || "server_exchange_error",
        error_description: `${exchangeError.message} (Server-side exchange failed)`,
      });

      return NextResponse.redirect(
        new URL(`/auth/error?${errorParams.toString()}`, request.url),
      );
    }

    console.log("Server-side session exchange successful!");
    console.log("User ID:", data.session?.user.id);
    console.log("User email:", data.session?.user.email);
    console.log("User metadata:", data.session?.user.user_metadata);
    console.log("App metadata:", data.session?.user.app_metadata);

    if (!data.session?.user) {
      console.error("No session user found after exchange");
      const errorParams = new URLSearchParams({
        error: "no_session_user",
        error_description: "No user session found after code exchange",
      });
      return NextResponse.redirect(
        new URL(`/auth/error?${errorParams.toString()}`, request.url),
      );
    }

    // Wait a moment for the trigger to execute and session to be fully established
    console.log("Waiting for database trigger and session persistence...");
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Reduced from 3000ms

    // Check if profile exists
    console.log("Checking if profile exists...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id, database_role, full_name")
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    console.log("Profile check result:", profile);
    console.log("Profile error:", profileError);

    let redirectUrl: string;

    if (profileError) {
      console.error("Profile query failed:", profileError);

      // If profile query fails but session is valid, assume new user
      console.log(
        "Profile query failed but session is valid, assuming new user",
      );
      const email = data.session.user.email || "";
      const isAdmin =
        email.includes("@admin") || email.includes("yourdomain.com");

      redirectUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${encodeURIComponent(data.session.user.user_metadata?.full_name || email.split("@")[0])}`;
      console.log("Fallback: redirecting to profile creation:", redirectUrl);
    } else if (profile) {
      // Existing user - redirect to appropriate dashboard
      const userRole =
        data.session.user.app_metadata?.role || profile.database_role;
      const isAdmin = userRole === "admin";
      redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
      console.log("Existing user, redirecting to:", redirectUrl);
    } else {
      // New user - redirect to profile creation
      const email = data.session.user.email || "";
      const isAdmin =
        email.includes("@admin") || email.includes("yourdomain.com");

      redirectUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${encodeURIComponent(data.session.user.user_metadata?.full_name || email.split("@")[0])}`;
      console.log("New user, redirecting to profile creation:", redirectUrl);
    }

    // Create a response with proper redirect
    console.log("Final redirect URL:", redirectUrl);

    // Verify session is properly accessible before redirecting
    try {
      const testClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              // No-op - just testing access
            },
            remove(name: string, options: any) {
              // No-op - just testing access
            },
          },
        },
      );

      const { data: testSession } = await testClient.auth.getSession();
      console.log("Session verification test:", testSession);

      if (!testSession?.session?.user?.id) {
        console.error("Session not properly accessible after OAuth exchange");
        // Still redirect but with error indicator
        const errorParams = new URLSearchParams({
          error: "session_not_accessible",
          error_description: "Session created but not accessible to client",
        });
        return NextResponse.redirect(
          new URL(`/auth/error?${errorParams.toString()}`, request.url),
        );
      }
    } catch (testError) {
      console.error("Session verification failed:", testError);
    }

    // The session cookies should already be set by the exchangeCodeForSession call
    // Just need to redirect to the appropriate page
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    return response;
  } catch (error) {
    console.error("Unexpected server-side auth error:", error);

    const errorParams = new URLSearchParams({
      error: "unexpected_server_error",
      error_description: "Unexpected error during authentication",
    });

    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }
}
