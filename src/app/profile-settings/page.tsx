import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileSettingsClient from "./ProfileSettingsClient";
import type { Profile } from "@/types/database";

export default async function ProfileSettings() {
  // ✅ Check session on SERVER where it always works!
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("=== PROFILE SETTINGS SERVER COMPONENT ===");
  console.log("Session found:", !!session);
  console.log("User ID:", session?.user?.id);

  if (!session?.user) {
    console.log("No session on server, redirecting to login");
    redirect("/login");
  }

  // Fetch user's profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError);
    redirect("/dashboard");
  }

  // Check if user is admin
  const isAdmin = profile.database_role === "admin";

  console.log("Profile settings data loaded:", {
    userId: session.user.id,
    fullName: profile.full_name,
    isAdmin,
  });

  // Pass to client component for interactivity
  return (
    <ProfileSettingsClient profile={profile as Profile} isAdmin={isAdmin} />
  );
}
