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

          // Update app_metadata with role
          await supabase.auth.updateUser({
            data: {
              role: roleHint, // Store role in app_metadata
            },
          });

          // Update database role via RPC
          const { error: roleUpdateError } = await supabase.rpc(
            "update_user_role",
            {
              user_id: user.id,
              new_role: roleHint === "admin" ? "Admin" : "User",
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

        // Check if profile exists, create if missing
        const { data: profile } = await supabase
          .from("profiles")
          .select("database_role")
          .eq("id", user.id)
          .single();

        console.log("📋 Profile check:", { profile });

        // If no profile exists, create one
        if (!profile) {
          console.log("🆕 Creating new profile for user");
          const userMetadata = user.user_metadata;
          const appMetadata = user.app_metadata;

          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name:
                userMetadata?.name || userMetadata?.full_name || "Unknown",
              email: user.email,
              database_role: roleHint === "admin" ? "Admin" : "User", // Use role hint from OAuth
              visual_role: userMetadata?.visual_role,
              educational_level: userMetadata?.educational_level,
              department: userMetadata?.department,
            });

          if (insertError) {
            console.error("❌ Profile creation error:", insertError);
            // Continue anyway, the trigger might handle it
          } else {
            console.log("✅ Profile created successfully");
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

          const userRole =
            updatedProfile?.database_role ||
            (user.app_metadata?.role === "admin" ? "Admin" : "User") ||
            (roleHint === "admin" ? "Admin" : "User"); // Use roleHint as fallback

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
