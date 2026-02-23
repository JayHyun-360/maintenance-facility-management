import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Singleton pattern to prevent multiple client instances
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const createClient = () => {
  if (!clientInstance) {
    clientInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Use pkce flow for better security and reliability
          flowType: "pkce",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true, // Critical for OAuth callback handling
        },
      },
    );
  }
  return clientInstance;
};
