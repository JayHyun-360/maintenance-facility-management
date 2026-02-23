import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const databaseRole = searchParams.get("database_role");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // CRITICAL: Update user metadata with selected role
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && databaseRole) {
        await supabase.auth.updateUser({
          data: { app_metadata: { role: databaseRole } },
        });
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
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
