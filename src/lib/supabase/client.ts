import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createCustomStorage } from "./storage";

// Singleton pattern to prevent multiple client instances
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export const createClient = () => {
  if (!clientInstance) {
    clientInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Use custom storage to ensure PKCE verifier persistence
          storage: createCustomStorage(),
          flowType: "pkce", // Re-enable PKCE with proper storage
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true, // Important for OAuth callback handling
        },
      },
    );
  }
  return clientInstance;
};
