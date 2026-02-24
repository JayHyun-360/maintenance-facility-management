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
          // Let server-side handle PKCE, client just needs basic session management
          flowType: "implicit", // Use implicit flow for client-side
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // Let server-side handle this
        },
      },
    );
  }
  return clientInstance;
};
