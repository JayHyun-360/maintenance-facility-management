"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function updateProfile(data: {
  full_name?: string;
  visual_role?: string;
  theme_preference?: string;
}) {
  const supabase = await createServerClient();

  console.log("=== UPDATE PROFILE ACTION ===");
  console.log("Data to update:", data);

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
    // Build update object - only include provided fields
    const updateData: Record<string, string> = {};
    
    if (data.full_name !== undefined) {
      updateData.full_name = data.full_name;
    }
    if (data.visual_role !== undefined) {
      updateData.visual_role = data.visual_role;
    }
    if (data.theme_preference !== undefined) {
      updateData.theme_preference = data.theme_preference;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        error: "No fields to update",
        success: false,
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
        error: `Failed to update profile: ${updateError.message}`,
        success: false,
      };
    }

    console.log("Profile update completed successfully");

    return {
      error: null,
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    return {
      error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
