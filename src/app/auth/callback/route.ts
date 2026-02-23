import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const databaseRole = searchParams.get("database_role");
  const next = searchParams.get("next") ?? "/";

  const supabase = createServerClient();
  let error = null;

  // Handle authorization code flow (preferred)
  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    error = exchangeError;
  }
  // Handle implicit flow with access token (fallback)
  else if (accessToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });
    error = sessionError;
  }

  if (!error) {
    // Get user and check if profile exists
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && databaseRole) {
      // Update user metadata with selected role
      await supabase.auth.updateUser({
        data: { app_metadata: { role: databaseRole } },
      });

      // Check if user profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, full_name, visual_role, educational_level, department")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        // New user - redirect to profile creation
        const profileCreationUrl = new URL("/profile-creation", origin);
        profileCreationUrl.searchParams.set("role", databaseRole);
        profileCreationUrl.searchParams.set(
          "name",
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        );
        return NextResponse.redirect(profileCreationUrl);
      }
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Log error for debugging
  console.error("Auth callback error:", error);
  return NextResponse.redirect(`${origin}/auth/error`);
}
