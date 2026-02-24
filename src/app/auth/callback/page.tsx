import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuthCallbackClient from "./AuthCallbackClient";

interface CallbackPageProps {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
    next?: string;
  }>;
}

export default async function AuthCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const { code, error, error_description, next } = await searchParams;

  // If there's an error, redirect to error page
  if (error) {
    console.error("OAuth error from server:", error, error_description);
    const errorParams = new URLSearchParams({
      error: error || "oauth_error",
      error_description: error_description || "OAuth authentication failed",
    });
    redirect(`/auth/error?${errorParams.toString()}`);
  }

  if (code) {
    try {
      console.log("=== SERVER-SIDE AUTH CALLBACK ===");
      console.log("OAuth code received:", code);

      const supabase = await createServerClient();

      // Exchange the code for a session on the server
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

        redirect(`/auth/error?${errorParams.toString()}`);
      }

      console.log("Server-side session exchange successful!");
      console.log("User ID:", data.session?.user.id);
      console.log("User email:", data.session?.user.email);
      console.log("User metadata:", data.session?.user.user_metadata);
      console.log("App metadata:", data.session?.user.app_metadata);

      // Wait a moment for the trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if profile exists
      if (data.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, database_role, full_name")
          .eq("id", data.session.user.id)
          .single();

        console.log("Profile check result:", profile);
        console.log("Profile error:", profileError);

        if (profileError) {
          console.error("Profile query failed:", profileError);

          // Try to debug the issue
          try {
            const { data: debugData } = await supabase.rpc(
              "debug_user_creation",
              {
                user_id: data.session.user.id,
              } as any,
            );
            console.log("Debug user creation data:", debugData);
          } catch (debugError) {
            console.error("Debug function failed:", debugError);
          }

          const errorParams = new URLSearchParams({
            error: "profile_creation_failed",
            error_description: `Profile creation failed: ${profileError.message}`,
          });

          redirect(`/auth/error?${errorParams.toString()}`);
        }

        if (profile) {
          // Existing user - redirect to appropriate dashboard
          const userRole =
            data.session.user.app_metadata?.role ||
            (profile as any).database_role;
          const isAdmin = userRole === "admin";
          const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";

          console.log("Existing user, redirecting to:", redirectUrl);
          redirect(redirectUrl);
        } else {
          // New user - redirect to profile creation
          const email = data.session.user.email || "";
          const isAdmin =
            email.includes("@admin") || email.includes("yourdomain.com");

          const profileCreationUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${encodeURIComponent(data.session.user.user_metadata?.full_name || email.split("@")[0])}`;

          console.log(
            "New user, redirecting to profile creation:",
            profileCreationUrl,
          );
          redirect(profileCreationUrl);
        }
      }

      // Fallback redirect
      redirect(next || "/dashboard");
    } catch (error) {
      console.error("Unexpected server-side auth error:", error);

      const errorParams = new URLSearchParams({
        error: "unexpected_server_error",
        error_description: "Unexpected error during authentication",
      });

      redirect(`/auth/error?${errorParams.toString()}`);
    }
  }

  // If no code, show client-side callback (for fallback cases)
  return <AuthCallbackClient searchParams={await searchParams} />;
}
