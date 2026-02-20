import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const roleHint = searchParams.get("role_hint"); // Get role hint from OAuth

  console.log("🔍 Auth callback received:", {
    hasCode: !!code,
    next,
    error,
    roleHint,
    origin,
  });

  // Handle OAuth errors
  if (error) {
    console.error("❌ OAuth error returned:", error);
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error)}`,
    );
  }

  if (code) {
    try {
      console.log("🔄 Exchanging code for session...");
      const supabase = await createClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("❌ Auth code exchange error:", exchangeError);
        return NextResponse.redirect(
          `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`,
        );
      }

      console.log("✅ Code exchange successful");

      // Get user data to check role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        console.log("👤 User authenticated:", {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        });

        // If we have a role hint, update the user's app_metadata and database role
        if (roleHint && (roleHint === "admin" || roleHint === "user")) {
          console.log("🎯 Updating user role from hint:", roleHint);

          const databaseRole = roleHint === "admin" ? "Admin" : "User";

          // Update app_metadata with role for middleware/circuit breaker pattern
          await supabase.auth.updateUser({
            data: {
              role: roleHint, // Store role in app_metadata
              database_role: databaseRole, // Store in user_metadata for trigger
            },
          });

          // Update database role via RPC (backup method)
          const { error: roleUpdateError } = await supabase.rpc(
            "update_user_role",
            {
              user_id: user.id,
              new_role: databaseRole,
            },
          );

          if (roleUpdateError) {
            console.error("⚠️ Role update error:", roleUpdateError);
          } else {
            console.log("✅ Role updated successfully:", roleHint);
          }
        }

        // Wait a moment for the sync_user_role trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Profile creation is now handled by the sync_user_role trigger
        // But add manual fallback if trigger fails
        const { data: fallbackProfile } = await supabase
          .from("profiles")
          .select("database_role, visual_role")
          .eq("id", user.id)
          .single();

        if (!fallbackProfile) {
          console.log(
            "⚠️ Trigger failed, performing manual profile creation fallback",
          );

          // Manual insertion as emergency fallback
          const databaseRole = roleHint === "admin" ? "Admin" : "User";
          const userMetadata = user.user_metadata;

          try {
            const { error: fallbackError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                full_name:
                  userMetadata?.name ||
                  userMetadata?.full_name ||
                  user.email ||
                  "Unknown",
                email: user.email,
                database_role: databaseRole,
                visual_role: userMetadata?.visual_role,
                educational_level: userMetadata?.educational_level,
                department: userMetadata?.department,
                is_guest: false, // Google OAuth users are not guests
              });

            if (fallbackError) {
              console.error("❌ Manual fallback also failed:", fallbackError);
              // Continue anyway - user will be authenticated but profile missing
            } else {
              console.log("✅ Manual fallback profile creation successful");
            }
          } catch (error) {
            console.error("❌ Manual fallback exception:", error);
          }
        }

        // Determine redirect based on role
        let redirectUrl = next;
        if (next === "/" || next === "/dashboard") {
          // Re-fetch profile to get the most up-to-date role
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("database_role, visual_role")
            .eq("id", user.id)
            .single();

          // Consistently use app_metadata for role checking (circuit breaker pattern)
          const userRole =
            user.app_metadata?.role === "admin" ? "Admin" : "User";

          // For User role, check if visual role is set
          if (userRole === "User" && !updatedProfile?.visual_role) {
            // User without visual role - redirect to dashboard for profile completion
            redirectUrl = "/dashboard";
          } else {
            redirectUrl =
              userRole === "Admin" ? "/admin/dashboard" : "/dashboard";
          }

          console.log("🎯 Final redirect decision:", { userRole, redirectUrl });
        }

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        const baseUrl = isLocalEnv
          ? origin
          : forwardedHost
            ? `https://${forwardedHost}`
            : origin;

        const finalUrl = `${baseUrl}${redirectUrl}`;
        console.log("🚀 Redirecting to:", finalUrl);

        return NextResponse.redirect(finalUrl);
      }
    } catch (error) {
      console.error("❌ Auth callback error:", error);
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent("Authentication failed")}`,
      );
    }
  }

  console.error("❌ No authorization code received");
  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("No authorization code received")}`,
  );
}
