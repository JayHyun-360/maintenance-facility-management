import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut, getAllProfiles } from "@/actions/auth";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";

async function AdminDashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = user.user_metadata?.database_role || user.app_metadata?.role;
  if (userRole !== "Admin") {
    redirect("/dashboard");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get all profiles
  const { data: profiles } = await getAllProfiles();

  return (
    <AdminDashboard
      user={{ id: user.id, email: user.email || "" }}
      profile={profile}
      profiles={profiles || []}
    />
  );
}

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div>Loading admin dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
