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
          // Use PKCE flow to match server-side configuration
          flowType: "pkce",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // Let server-side handle this
          // Explicitly set storage method for better persistence
          storage: {
            getItem: (key) => {
              if (typeof window !== "undefined") {
                return localStorage.getItem(key);
              }
              return null;
            },
            setItem: (key, value) => {
              if (typeof window !== "undefined") {
                localStorage.setItem(key, value);
              }
            },
            removeItem: (key) => {
              if (typeof window !== "undefined") {
                localStorage.removeItem(key);
              }
            },
          },
        },
      },
    );
  }
  return clientInstance;
};
