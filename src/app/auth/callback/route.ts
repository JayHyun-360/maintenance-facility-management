import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") || "/";
  const cookieStore = await cookies();

  // If there's an error, redirect to error page
  if (error) {
    const errorParams = new URLSearchParams({
      error: error || "oauth_error",
      error_description: errorDescription || "OAuth authentication failed",
    });
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }

  if (!code) {
    const errorParams = new URLSearchParams({
      error: "no_code",
      error_description: "No authentication code found in callback",
    });
    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }

  try {
    const supabase = await createServerClient();

    // Exchange the code for a session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // Redirect to error page with detailed error information
      const errorParams = new URLSearchParams({
        error: exchangeError.code || "server_exchange_error",
        error_description: `${exchangeError.message} (Server-side exchange failed)`,
      });

      return NextResponse.redirect(
        new URL(`/auth/error?${errorParams.toString()}`, request.url),
      );
    }

    if (!data.session?.user) {
      const errorParams = new URLSearchParams({
        error: "no_session_user",
        error_description: "No user session found after code exchange",
      });
      return NextResponse.redirect(
        new URL(`/auth/error?${errorParams.toString()}`, request.url),
      );
    }

    // Wait a moment for the trigger to execute and session to be fully established
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, database_role, full_name")
      .eq("id", data.session.user.id)
      .maybeSingle();

    let redirectUrl: string;

    if (profileError) {
      // If profile query fails but session is valid, assume new user
      const email = data.session.user.email || "";
      const name =
        data.session.user.user_metadata?.full_name || email.split("@")[0];

      redirectUrl = `/profile-creation?role=user&name=${encodeURIComponent(name)}`;
    } else if (profile) {
      // Existing user - redirect to appropriate dashboard
      const isAdmin = profile.database_role === "admin";
      redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
    } else {
      // New user - redirect to profile creation (default to user role)
      const email = data.session.user.email || "";
      const name =
        data.session.user.user_metadata?.full_name || email.split("@")[0];

      redirectUrl = `/profile-creation?role=user&name=${encodeURIComponent(name)}`;
    }

    // Verify session is properly accessible before redirecting
    try {
      const testClient = await createServerClient();

      const { data: testSession } = await testClient.auth.getSession();

      if (!testSession?.session?.user?.id) {
        const errorParams = new URLSearchParams({
          error: "session_not_accessible",
          error_description: "Session created but not accessible to client",
        });
        return NextResponse.redirect(
          new URL(`/auth/error?${errorParams.toString()}`, request.url),
        );
      }
    } catch (testError) {
      // Continue with redirect
    }

    // The session cookies should already be set by exchangeCodeForSession call
    // Just need to redirect to the appropriate page
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    return response;
  } catch (error) {
    const errorParams = new URLSearchParams({
      error: "unexpected_server_error",
      error_description: "Unexpected error during authentication",
    });

    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    );
  }
}
