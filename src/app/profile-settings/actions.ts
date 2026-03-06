"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function switchAdminMode(enableAdmin: boolean) {
  const supabase = await createServerClient();

  console.log("=== SWITCH ADMIN MODE ACTION ===");
  console.log("Target mode:", enableAdmin ? "admin" : "user");

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      error: "No authenticated session",
      success: false,
    };
  }

  const userId = session.user.id;

  try {
    // First, get current profile to verify permissions and preserve data
    const { data: currentProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    console.log("Current profile data:", {
      database_role: currentProfile?.database_role,
      visual_role: currentProfile?.visual_role,
      educational_level: currentProfile?.educational_level,
      department: currentProfile?.department,
    });

    if (fetchError || !currentProfile) {
      return {
        error: "Profile not found",
        success: false,
      };
    }

    // SECURITY: Check if user actually has admin privileges in the database
    if (enableAdmin && currentProfile.database_role !== "admin") {
      return {
        error: "You do not have admin privileges",
        success: false,
      };
    }

    // Prepare atomic update based on target mode
    let updateData: any;

    if (enableAdmin) {
      // Switching TO admin mode
      // Set visual_role to Staff for admin mode, clear user-specific fields
      updateData = {
        database_role: "admin",
        visual_role: "Staff",
        educational_level: null,
        department: null,
      };
    } else {
      // Switching TO user mode
      // Preserve existing visual_role unless it's Staff (from admin mode)
      const newVisualRole =
        currentProfile.visual_role === "Staff"
          ? "Student"
          : currentProfile.visual_role;

      updateData = {
        database_role: "user",
        visual_role: newVisualRole || "Student",
        // Preserve educational_level and department if they exist
        educational_level: currentProfile.educational_level || "",
        department: currentProfile.department || "",
      };
    }

    console.log("Update data prepared:", updateData);

    // Execute atomic update
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Database update failed:", updateError);
      return {
        error: `Failed to switch mode: ${updateError.message}`,
        success: false,
      };
    }

    console.log("Mode switch completed successfully");

    return {
      error: null,
      success: true,
      message: enableAdmin ? "Switched to admin mode" : "Switched to user mode",
      redirect: enableAdmin ? "/admin/dashboard" : "/dashboard",
    };
  } catch (error) {
    return {
      error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
