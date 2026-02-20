import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user data to check role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
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

          await supabase.from("profiles").insert({
            id: user.id,
            full_name:
              userMetadata?.name || userMetadata?.full_name || "Unknown",
            email: user.email,
            database_role: appMetadata?.role === "admin" ? "Admin" : "User",
            visual_role: userMetadata?.visual_role,
            educational_level: userMetadata?.educational_level,
            department: userMetadata?.department,
          });
        }

        // Determine redirect based on role
        let redirectUrl = next;
        if (next === "/" || next === "/dashboard") {
          const userRole =
            profile?.database_role ||
            (user.app_metadata?.role === "admin" ? "Admin" : "User");
          redirectUrl =
            userRole === "Admin" ? "/admin/dashboard" : "/dashboard";
        }

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${redirectUrl}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(
            `https://${forwardedHost}${redirectUrl}`,
          );
        } else {
          return NextResponse.redirect(`${origin}${redirectUrl}`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
