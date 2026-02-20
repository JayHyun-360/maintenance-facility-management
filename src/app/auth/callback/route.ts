import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error)}`,
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Auth code exchange error:", exchangeError);
        return NextResponse.redirect(
          `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`,
        );
      }

      // Get user data to check role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Wait a moment for the sync_user_role trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check if profile exists, create if missing
        const { data: profile } = await supabase
          .from("profiles")
          .select("database_role")
          .eq("id", user.id)
          .single();

        // If no profile exists, create one
        if (!profile) {
          const userMetadata = user.user_metadata;
          const appMetadata = user.app_metadata;

          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name:
                userMetadata?.name || userMetadata?.full_name || "Unknown",
              email: user.email,
              database_role: appMetadata?.role === "admin" ? "Admin" : "User",
              visual_role: userMetadata?.visual_role,
              educational_level: userMetadata?.educational_level,
              department: userMetadata?.department,
            });

          if (insertError) {
            console.error("Profile creation error:", insertError);
            // Continue anyway, the trigger might handle it
          }
        }

        // Determine redirect based on role
        let redirectUrl = next;
        if (next === "/" || next === "/dashboard") {
          // Re-fetch profile to get the most up-to-date role
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("database_role")
            .eq("id", user.id)
            .single();

          const userRole =
            updatedProfile?.database_role ||
            (user.app_metadata?.role === "admin" ? "Admin" : "User");
          redirectUrl =
            userRole === "Admin" ? "/admin/dashboard" : "/dashboard";
        }

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        const baseUrl = isLocalEnv
          ? origin
          : forwardedHost
            ? `https://${forwardedHost}`
            : origin;

        return NextResponse.redirect(`${baseUrl}${redirectUrl}`);
      }
    } catch (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent("Authentication failed")}`,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("No authorization code received")}`,
  );
}
