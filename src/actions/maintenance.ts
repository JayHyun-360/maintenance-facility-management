"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MaintenanceRequest,
  Facility,
  RequestAnalytics,
} from "@/types/maintenance";
import {
  notifyAdminsNewRequest,
  notifyUserRequestCompletion,
} from "@/actions/notifications";

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
  const supporting_reasons = formData.get("supporting_reasons") as string;
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
        supporting_reasons: supporting_reasons || null,
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
      return { success: false, error: "Failed to create maintenance request" };
    }

    // Get user profile for email notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    // Send email notification to admins
    await notifyAdminsNewRequest({
      id: data.id,
      description: data.description,
      requester_name: profile?.name || user.email || "Unknown",
      category: data.category,
      priority: data.urgency,
      facility: data.location_building,
    });

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getUserRequests(
  userId: string,
): Promise<{ success: boolean; data?: MaintenanceRequest[]; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(
        `
        *,
        requester:profiles(name, email, visual_role)
      `,
      )
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user requests:", error);
      return { success: false, error: "Failed to fetch requests" };
    }

    return { success: true, data: data as MaintenanceRequest[] };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getAllRequests(): Promise<{
  success: boolean;
  data?: MaintenanceRequest[];
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(
        `
        *,
        requester:profiles(name, email, visual_role)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all requests:", error);
      return { success: false, error: "Failed to fetch requests" };
    }

    return { success: true, data: data as MaintenanceRequest[] };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
  completionData?: { action_taken: string; work_evaluation: string },
) {
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
    const updateData: any = { status };

    // Add completion data when marking as completed
    if (status === "Completed" && completionData) {
      updateData.action_taken = completionData.action_taken;
      updateData.work_evaluation = completionData.work_evaluation;
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("Error updating request status:", error);
      return { success: false, error: "Failed to update request status" };
    }

    // Send email notification to user if request is completed
    if (status === "Completed") {
      // Get requester profile for email
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", data.requester_id)
        .single();

      if (requesterProfile?.email) {
        await notifyUserRequestCompletion({
          id: data.id,
          description: data.description,
          requester_email: requesterProfile.email,
          requester_name: requesterProfile.name || requesterProfile.email,
          action_taken: completionData?.action_taken,
          work_evaluation: completionData?.work_evaluation,
        });
      }
    }

    revalidatePath("/admin/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getFacilities(): Promise<{
  success: boolean;
  data?: Facility[];
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching facilities:", error);
      return { success: false, error: "Failed to fetch facilities" };
    }

    return { success: true, data: data as Facility[] };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createFacility(name: string, description?: string) {
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

  try {
    const { data, error } = await supabase
      .from("facilities")
      .insert({ name, description: description || null })
      .select()
      .single();

    if (error) {
      console.error("Error creating facility:", error);
      return { success: false, error: "Failed to create facility" };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateFacility(
  id: string,
  name: string,
  description?: string,
  is_active?: boolean,
) {
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

  try {
    const { data, error } = await supabase
      .from("facilities")
      .update({
        name,
        description: description || null,
        ...(is_active !== undefined && { is_active }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating facility:", error);
      return { error: "Failed to update facility" };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteFacility(id: string) {
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

  try {
    const { error } = await supabase.from("facilities").delete().eq("id", id);

    if (error) {
      console.error("Error deleting facility:", error);
      return { error: "Failed to delete facility" };
    }

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getRequestAnalytics(): Promise<{
  success: boolean;
  data?: RequestAnalytics;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Get all requests with requester information
    const { data: requests, error } = await supabase.from(
      "maintenance_requests",
    ).select(`
        *,
        requester:profiles(visual_role)
      `);

    if (error) {
      console.error("Error fetching requests for analytics:", error);
      return { success: false, error: "Failed to fetch analytics data" };
    }

    // Calculate analytics
    const totalRequests = requests?.length || 0;
    const pendingRequests =
      requests?.filter((r) => r.status === "Pending").length || 0;
    const inProgressRequests =
      requests?.filter((r) => r.status === "In Progress").length || 0;
    const completedRequests =
      requests?.filter((r) => r.status === "Completed").length || 0;

    // Requests by visual role
    const requestsByVisualRole = {
      Teacher:
        requests?.filter((r) => r.requester?.visual_role === "Teacher")
          .length || 0,
      Staff:
        requests?.filter((r) => r.requester?.visual_role === "Staff").length ||
        0,
      Student:
        requests?.filter((r) => r.requester?.visual_role === "Student")
          .length || 0,
    };

    // Work quality distribution
    const workQualityDistribution = {
      Outstanding:
        requests?.filter((r) => r.work_evaluation === "Outstanding").length ||
        0,
      "Very Satisfactory":
        requests?.filter((r) => r.work_evaluation === "Very Satisfactory")
          .length || 0,
      Satisfactory:
        requests?.filter((r) => r.work_evaluation === "Satisfactory").length ||
        0,
      Poor: requests?.filter((r) => r.work_evaluation === "Poor").length || 0,
    };

    // Requests by category
    const requestsByCategory: Record<string, number> = {};
    requests?.forEach((r) => {
      requestsByCategory[r.category] =
        (requestsByCategory[r.category] || 0) + 1;
    });

    // Requests by urgency
    const requestsByUrgency = {
      Emergency: requests?.filter((r) => r.urgency === "Emergency").length || 0,
      High: requests?.filter((r) => r.urgency === "High").length || 0,
      Medium: requests?.filter((r) => r.urgency === "Medium").length || 0,
      Low: requests?.filter((r) => r.urgency === "Low").length || 0,
    };

    const analytics: RequestAnalytics = {
      total_requests: totalRequests,
      pending_requests: pendingRequests,
      in_progress_requests: inProgressRequests,
      completed_requests: completedRequests,
      requests_by_visual_role: requestsByVisualRole,
      work_quality_distribution: workQualityDistribution,
      requests_by_category: requestsByCategory,
      requests_by_urgency: requestsByUrgency,
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
