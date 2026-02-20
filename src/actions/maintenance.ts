"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createMaintenanceRequest(formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const urgency = formData.get("urgency") as string;
  const location_building = formData.get("location_building") as string;
  const location_room = formData.get("location_room") as string;

  if (!title || !description || !category || !urgency || !location_building) {
    return { error: "All required fields must be filled" };
  }

  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        title,
        description,
        category,
        urgency,
        location_building,
        location_room: location_room || null,
        requester_id: user.id,
        status: "Pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating maintenance request:", error);
      return { error: "Failed to create maintenance request" };
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function getUserRequests(userId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        requester:profiles(name, email)
      `)
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user requests:", error);
      return { error: "Failed to fetch requests" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function getAllRequests() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        requester:profiles(name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all requests:", error);
      return { error: "Failed to fetch requests" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function updateRequestStatus(requestId: string, status: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  // Check if user is admin
  const userRole = user.user_metadata?.database_role || user.app_metadata?.role;
  if (userRole !== "Admin") {
    return { error: "Unauthorized: Admin access required" };
  }

  if (!["Pending", "In Progress", "Completed"].includes(status)) {
    return { error: "Invalid status" };
  }

  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ status })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("Error updating request status:", error);
      return { error: "Failed to update request status" };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
