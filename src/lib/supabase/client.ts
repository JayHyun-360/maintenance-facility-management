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

  return supabaseInstance;
};
