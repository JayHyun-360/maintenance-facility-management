"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  try {
    console.log("=== SERVER-SIDE GOOGLE OAUTH INITIATION ===");

    const supabase = await createServerClient();

    // Get the OAuth URL from server with proper PKCE handling
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Server-side Google OAuth error:", error);
      throw new Error(`OAuth initiation failed: ${error.message}`);
    }

    console.log("Server-side Google OAuth initiated successfully");
    console.log("OAuth URL:", data.url);

    // Redirect to OAuth provider
    redirect(data.url);
  } catch (error) {
    console.error("Unexpected server-side OAuth error:", error);
    throw error;
  }
}
