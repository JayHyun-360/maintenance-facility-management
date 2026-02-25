import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UserDashboardClient from "./UserDashboardClient";
import type { Profile, MaintenanceRequest } from "@/types/database";

export default async function UserDashboard() {
  // ✅ Check session on SERVER where it always works!
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("=== DASHBOARD SERVER COMPONENT ===");
  console.log("Session found:", !!session);
  console.log("User ID:", session?.user?.id);

  if (!session?.user) {
    console.log("No session on server, redirecting to login");
    redirect("/login");
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116 is "No rows returned" - which is expected if profile doesn't exist yet
    console.error("Error fetching profile:", profileError);
  }

  // Create a basic profile if none exists
  const finalProfile: Profile | null = profile || {
    id: session.user.id,
    full_name:
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email ||
      "Unknown User",
    database_role: "user" as const,
    visual_role: null,
    educational_level: null,
    department: null,
    is_anonymous: false,
    theme_preference: "system" as const,
    created_at: new Date().toISOString(),
  };

  // Fetch requests
  const { data: requests = [] } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("requester_id", session.user.id)
    .order("created_at", { ascending: false });

  console.log("Dashboard data loaded:", {
    userId: session.user.id,
    profileName: finalProfile?.full_name,
    requestCount: requests?.length,
  });

  // Pass to client component for interactivity
  return (
    <UserDashboardClient
      initialProfile={finalProfile}
      initialRequests={(requests || []) as MaintenanceRequest[]}
      userId={session.user.id}
    />
  );
}
