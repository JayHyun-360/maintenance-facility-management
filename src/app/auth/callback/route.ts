import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    try {
      console.log("=== SERVER-SIDE AUTH CALLBACK ===");
      console.log("OAuth code received:", code);
      
      const supabase = await createServerClient();
      
      // Exchange the code for a session on the server
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Server-side code exchange error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        // Redirect to error page with detailed error information
        const errorParams = new URLSearchParams({
          error: error.code || "server_exchange_error",
          error_description: `${error.message} (Server-side exchange failed)`
        });
        
        return NextResponse.redirect(
          new URL(`/auth/error?${errorParams.toString()}`, request.url)
        );
      }

      console.log("Server-side session exchange successful!");
      console.log("User ID:", data.session?.user.id);
      console.log("User email:", data.session?.user.email);
      console.log("User metadata:", data.session?.user.user_metadata);
      console.log("App metadata:", data.session?.user.app_metadata);

      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

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
            const { data: debugData } = await supabase.rpc('debug_user_creation', {
              user_id: data.session.user.id
            } as any);
            console.log("Debug user creation data:", debugData);
          } catch (debugError) {
            console.error("Debug function failed:", debugError);
          }
          
          const errorParams = new URLSearchParams({
            error: "profile_creation_failed",
            error_description: `Profile creation failed: ${profileError.message}`
          });
          
          return NextResponse.redirect(
            new URL(`/auth/error?${errorParams.toString()}`, request.url)
          );
        }

        if (profile) {
          // Existing user - redirect to appropriate dashboard
          const userRole = data.session.user.app_metadata?.role || (profile as any).database_role;
          const isAdmin = userRole === 'admin';
          const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
          
          console.log("Existing user, redirecting to:", redirectUrl);
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        } else {
          // New user - redirect to profile creation
          const email = data.session.user.email || "";
          const isAdmin = email.includes("@admin") || email.includes("yourdomain.com");
          
          const profileCreationUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${encodeURIComponent(data.session.user.user_metadata?.full_name || email.split("@")[0])}`;
          
          console.log("New user, redirecting to profile creation:", profileCreationUrl);
          return NextResponse.redirect(new URL(profileCreationUrl, request.url));
        }
      }

      // Fallback redirect
      return NextResponse.redirect(new URL(next, request.url));
      
    } catch (error) {
      console.error("Unexpected server-side auth error:", error);
      
      const errorParams = new URLSearchParams({
        error: "unexpected_server_error",
        error_description: "Unexpected error during authentication"
      });
      
      return NextResponse.redirect(
        new URL(`/auth/error?${errorParams.toString()}`, request.url)
      );
    }
  }

  // No code parameter - redirect to error
  console.log("No OAuth code found in callback");
  const errorParams = new URLSearchParams({
    error: "no_code",
    error_description: "No authentication code found in callback"
  });
  
  return NextResponse.redirect(
    new URL(`/auth/error?${errorParams.toString()}`, request.url)
  );
}
