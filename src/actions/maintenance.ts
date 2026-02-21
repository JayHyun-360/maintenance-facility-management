"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MaintenanceRequest,
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

  try {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const supporting_reasons = formData.get("supporting_reasons") as string;
    const category = formData.get("category") as string;
    const urgency = formData.get("urgency") as string;
    const location_building = formData.get("location_building") as string;
    const location_room = formData.get("location_room") as string;

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        title,
        description,
        supporting_reasons,
        category,
        urgency,
        location_building,
        location_room,
        requester_id: user.id,
        status: "Pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating maintenance request:", error);
      return { error: "Failed to create maintenance request" };
    }

    // Send notification to admins
    await notifyAdminsNewRequest(data);

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getUserRequests(userId: string): Promise<{
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
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
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
      return { error: "Failed to update request status" };
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

export async function getAnalyticsData(): Promise<{
  success: boolean;
  data?: {
    statusCounts: {
      Pending: number;
      "In Progress": number;
      Completed: number;
      Cancelled: number;
      Reviewed: number;
    };
    timeSeriesData: Array<{
      date: string;
      count: number;
    }>;
    categoryCounts: Record<string, number>;
    priorityMonthly: {
      High: number;
      Medium: number;
      Low: number;
    };
  };
  error?: string;
}> {
  // Use service role client to bypass RLS for analytics
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all requests - service role bypasses RLS
    const { data: requests, error } = await supabase
      .from("maintenance_requests")
      .select("*");

    if (error) {
      console.error("Analytics Fetch Error:", error);
      return { success: false, error: `Failed to fetch analytics data: ${error.message}` };
    }

    // Handle empty data case
    if (!requests || requests.length === 0) {
      return {
        success: true,
        data: {
          statusCounts: {
            Pending: 0,
            "In Progress": 0,
            Completed: 0,
            Cancelled: 0,
            Reviewed: 0,
          },
          timeSeriesData: [],
          categoryCounts: {},
          priorityMonthly: {
            High: 0,
            Medium: 0,
            Low: 0,
          },
        },
      };
    }

    // Status Counts
    const statusCounts = {
      Pending: requests.filter((r) => r.status === "Pending").length,
      "In Progress": requests.filter((r) => r.status === "In Progress").length,
      Completed: requests.filter((r) => r.status === "Completed").length,
      Cancelled: requests.filter((r) => r.status === "Cancelled").length,
      Reviewed: requests.filter((r) => r.status === "Reviewed").length,
    };

    // Time-Series Data (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRequests = requests.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    );

    const timeSeriesData: Record<string, number> = {};
    recentRequests.forEach((request) => {
      const date = new Date(request.created_at).toISOString().split("T")[0];
      timeSeriesData[date] = (timeSeriesData[date] || 0) + 1;
    });

    // Fill missing dates with 0
    const timeSeries = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      timeSeries.push({
        date: dateStr,
        count: timeSeriesData[dateStr] || 0,
      });
    }

    // Category Counts
    const categoryCounts: Record<string, number> = {};
    requests.forEach((r) => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    // Priority Monthly Filter (Current month only)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthRequests = requests.filter((r) => {
      const requestDate = new Date(r.created_at);
      return (
        requestDate.getMonth() === currentMonth &&
        requestDate.getFullYear() === currentYear
      );
    });

    const priorityMonthly = {
      High: currentMonthRequests.filter(
        (r) => r.urgency === "High" || r.urgency === "Emergency",
      ).length,
      Medium: currentMonthRequests.filter((r) => r.urgency === "Medium").length,
      Low: currentMonthRequests.filter((r) => r.urgency === "Low").length,
    };

    return {
      success: true,
      data: {
        statusCounts,
        timeSeriesData: timeSeries,
        categoryCounts,
        priorityMonthly,
      },
    };
  } catch (error) {
    console.error("Analytics Fetch Error:", error);
    return { success: false, error: `An unexpected error occurred: ${error}` };
  }
}
