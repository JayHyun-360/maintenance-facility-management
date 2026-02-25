import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";
import type { Profile, MaintenanceRequest } from "@/types/database";

interface RequestWithProfile extends MaintenanceRequest {
  profiles: Profile | null;
  requester_name?: string;
}

export default async function AdminDashboard() {
  // ✅ Check session on SERVER where it always works!
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("=== ADMIN DASHBOARD SERVER COMPONENT ===");
  console.log("Session found:", !!session);
  console.log("User ID:", session?.user?.id);

  if (!session?.user) {
    console.log("No session on server, redirecting to login");
    redirect("/login");
  }

  // ✅ Use profile.database_role as the SOURCE OF TRUTH — not the JWT.
  // The JWT (app_metadata.role) can be stale if the role was changed directly
  // in the database before the session was refreshed. The DB trigger will
  // eventually sync it, but on first login after a direct DB change the JWT
  // may still carry the old value. Checking the profile table here is safe
  // and does NOT violate the Circuit Breaker pattern — we only read the
  // CURRENT user's own profile, not someone else's role for RLS purposes.
  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("database_role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !adminProfile) {
    console.error("Error fetching admin profile:", profileError);
    redirect("/login");
  }

  console.log(
    "Admin dashboard — profile.database_role:",
    adminProfile.database_role,
  );

  if (adminProfile.database_role !== "admin") {
    console.log(
      "Non-admin user trying to access admin dashboard, redirecting.",
    );
    redirect("/dashboard");
  }

  // Fetch all maintenance requests with requester profile data
  const { data } = await supabase
    .from("maintenance_requests")
    .select(
      `
      *,
      profiles (
        id,
        full_name,
        visual_role,
        educational_level,
        database_role
      )
    `,
    )
    .order("created_at", { ascending: false });

  const requests = (data as RequestWithProfile[]) || [];

  // Fetch full admin profile for settings sidebar
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Get user avatar from user_metadata
  const userAvatar = session.user.user_metadata?.avatar_url || null;

  // Calculate stats
  const initialStats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "Pending").length,
    inProgress: requests.filter((r) => r.status === "In Progress").length,
    completed: requests.filter((r) => r.status === "Completed").length,
  };

  console.log("Admin dashboard data loaded:", {
    userId: session.user.id,
    requestCount: requests.length,
    stats: initialStats,
  });

  // Pass to client component for interactivity
  return (
    <AdminDashboardClient
      initialRequests={requests}
      initialStats={initialStats}
      initialProfile={fullProfile}
      userAvatar={userAvatar}
    />
  );
}
