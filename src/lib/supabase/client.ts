import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Singleton pattern to prevent multiple client instances
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const createClient = () => {
  if (!clientInstance) {
    clientInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "pkce", // Use PKCE flow for better security
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true, // Important for OAuth callback handling
        },
      },
    );
  }
  return clientInstance;
};
