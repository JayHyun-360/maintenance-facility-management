"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  try {
    console.log("=== SERVER-SIDE GOOGLE OAUTH INITIATION ===");

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            cookieStore.delete({
              name,
              ...options,
            });
          },
        },
      },
    );

    // Get the OAuth URL from server with proper PKCE handling
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3002"}/auth/callback`,
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
