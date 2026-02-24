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
          detectSessionInUrl: true, // Match server-side configuration
          // Use cookie storage to match server-side session persistence
          storage: {
            getItem: (key) => {
              if (typeof window !== "undefined") {
                // Try to get from document.cookie first (server-set cookies)
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                  const cookie = cookies[i].trim();
                  if (cookie.startsWith(`${key}=`)) {
                    return decodeURIComponent(cookie.substring(key.length + 1));
                  }
                }
                // Fallback to localStorage for backward compatibility
                return localStorage.getItem(key);
              }
              return null;
            },
            setItem: (key, value) => {
              if (typeof window !== "undefined") {
                // Set in both cookie and localStorage for maximum compatibility
                document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax`;
                localStorage.setItem(key, value);
              }
            },
            removeItem: (key) => {
              if (typeof window !== "undefined") {
                document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
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
