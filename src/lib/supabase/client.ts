import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Singleton instance to prevent multiple client conflicts
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null =
  null;

// Create a client that works in client components with standard PKCE configuration
export const createClient = () => {
  if (supabaseInstance) {
    console.log("Returning existing Supabase client instance");
    return supabaseInstance;
  }

  console.log("Creating new Supabase client instance");

  // Check if we have existing session cookies and initialize client accordingly
  const hasExistingSession =
    typeof window !== "undefined" &&
    document.cookie.includes("sb-yozddskzyykymidjucqt-auth-token");

  console.log("Existing session cookies detected:", hasExistingSession);

  supabaseInstance = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  );

  // If we detected existing cookies, try to initialize session immediately
  if (hasExistingSession) {
    console.log("Initializing session from existing cookies...");
    // Small delay to ensure client is ready
    setTimeout(() => {
      supabaseInstance?.auth.getSession().then(({ data: { session } }) => {
        console.log(
          "Session initialization result:",
          session ? "success" : "failed",
        );
      });
    }, 100);
  }

  return supabaseInstance;
};
