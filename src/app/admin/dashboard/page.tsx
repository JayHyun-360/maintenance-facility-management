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

  // Check if user is admin
  const userRole = session.user.app_metadata?.role || "user";
  if (userRole !== "admin") {
    console.log("Non-admin user trying to access admin dashboard");
    redirect("/dashboard");
  }

  // Fetch all requests with profile data
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

  // ✅ Verify current user's profile is still admin
  // This handles cases where database_role was manually changed back to user
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("database_role")
    .eq("id", session.user.id)
    .single();

  if (adminProfile?.database_role !== "admin") {
    console.log(
      "User profile role changed from admin, redirecting to dashboard",
    );
    redirect("/dashboard");
  }

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
    />
  );
}
