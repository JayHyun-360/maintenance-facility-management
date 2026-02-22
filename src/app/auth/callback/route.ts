import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const roleHint = searchParams.get("role_hint"); // Get role hint from OAuth
  const forceRole = searchParams.get("force_role") === "true"; // Check if role should be forced

  console.log("🔍 Auth callback received:", {
    hasCode: !!code,
    next,
    error,
    roleHint,
    forceRole,
    origin,
    fullUrl: request.url,
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
          `${origin}/auth/error?error=${encodeURIComponent(`Code exchange failed: ${exchangeError.message}`)}`,
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

        // CRITICAL FIX: Check if role selection is needed
        if (forceRole && (!roleHint || roleHint === "select")) {
          console.log(
            "🔄 Role selection required - redirecting to selection page",
          );
          return NextResponse.redirect(
            `${origin}/auth/select-role?next=${encodeURIComponent(next)}&email=${encodeURIComponent(user.email || "")}`,
          );
        }

        // CRITICAL FIX: Only update role if we have a valid role hint or force_role
        if (roleHint && (roleHint === "admin" || roleHint === "user")) {
          console.log("🎯 Updating user role from hint:", roleHint);

          const databaseRole = roleHint === "admin" ? "Admin" : "User";

          // CRITICAL FIX: Update user_metadata first (for trigger), then app_metadata (for middleware)
          await supabase.auth.updateUser({
            data: {
              // Store in user_metadata for trigger to pick up
              database_role: databaseRole,
              // Also store in app_metadata for circuit breaker pattern
              role: roleHint,
            },
          });

          // Wait a moment for updateUser to trigger and complete
          await new Promise((resolve) => setTimeout(resolve, 500));

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
        } else if (forceRole && roleHint === "select") {
          console.log(
            "🔄 Force role selection requested - keeping current role",
          );
          // Don't update role, let user choose in UI
        }

        try {
          // Use the new wait_for_profile_sync function to ensure database has settled
          const { data: syncResult, error: syncError } = await supabase.rpc(
            "wait_for_profile_sync",
            {
              user_id: user.id,
              max_attempts: 20, // Wait up to 4 seconds (20 * 200ms)
            },
          );

          if (syncError) {
            console.error("❌ Profile sync RPC error:", syncError);
          } else {
            console.log("🔄 Profile sync result:", syncResult);
          }

          // Profile creation is now handled by the updated trigger
          // But add manual fallback if trigger failed or sync didn't complete
          const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("database_role, visual_role")
            .eq("id", user.id)
            .single();

          if (!fallbackProfile || syncError || !syncResult) {
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
                    userMetadata?.user_name ||
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
        } catch (error) {
          console.error("❌ Profile sync exception:", error);
        }

        // CRITICAL FIX: Determine redirect based on role
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

          // CRITICAL FIX: Admins bypass profile completion, go directly to admin dashboard
          if (userRole === "Admin") {
            redirectUrl = "/admin/dashboard";
            console.log("🎯 Admin user, redirecting to admin dashboard");
          } else {
            // For User role, check if visual role is set
            if (!updatedProfile?.visual_role) {
              // User without visual role - redirect to dashboard for profile completion
              redirectUrl = "/dashboard";
              console.log(
                "🎯 User without visual role, redirecting to profile completion",
              );
            } else {
              redirectUrl = "/dashboard";
              console.log(
                "🎯 User with visual role, redirecting to user dashboard",
              );
            }
          }
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
