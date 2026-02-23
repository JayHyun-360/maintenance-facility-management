import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const createServerClient = async () => {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
      auth: {
        flowType: "pkce", // Use PKCE flow for better security
        autoRefreshToken: true,
        persistSession: true,
      },
    },
  );
};
