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

    // Try multiple attempts to initialize session with increasing delays
    const initializeSession = async (attempt: number): Promise<any | null> => {
      console.log(`Session initialization attempt ${attempt}`);

      // Wait longer for each attempt
      const delay = 500 + attempt * 500; // 500ms, 1s, 1.5s, 2s
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        const result = await supabaseInstance?.auth.getSession();
        console.log(
          `Session initialization attempt ${attempt} result:`,
          (result as any)?.data?.session ? "success" : "failed",
        );

        if ((result as any)?.data?.session?.user?.id) {
          return (result as any).data.session;
        }
      } catch (error) {
        console.log(`Session initialization attempt ${attempt} error:`, error);
      }

      return null;
    };

    // Try up to 3 times with increasing delays
    (async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const session = await initializeSession(attempt);
        if (session) {
          console.log(`Session successfully initialized on attempt ${attempt}`);
          break;
        }
      }
    })();
  }

  return supabaseInstance;
};
