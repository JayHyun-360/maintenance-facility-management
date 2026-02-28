"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { DatabaseRole, VisualRole } from "@/types/database";

export async function createUserProfile(formData: {
  fullName: string;
  databaseRole: DatabaseRole;
  visualRole: VisualRole;
  educationalLevel: string | null;
  department: string | null;
}) {
  const supabase = await createServerClient();

  // Get the current session on the server
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      error: "No authenticated session found. Please sign in again.",
      success: false,
    };
  }

  const userId = session.user.id;

  console.log("=== SERVER ACTION: CREATING PROFILE ===");
  console.log("User ID:", userId);
  console.log("Profile data:", {
    fullName: formData.fullName,
    databaseRole: formData.databaseRole,
    visualRole: formData.visualRole,
    educationalLevel: formData.educationalLevel,
    department: formData.department,
  });

  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, database_role")
      .eq("id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing profile:", checkError);
      return {
        error: "Failed to check existing profile",
        success: false,
      };
    }

    if (existingProfile) {
      // Profile exists - check if this is a role switch scenario
      // If current role is different from requested role, allow update
      if (existingProfile.database_role !== formData.databaseRole) {
        console.log("Role switch detected, updating profile...");

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            database_role: formData.databaseRole,
            visual_role:
              formData.databaseRole === "admin" ? "Staff" : formData.visualRole,
            educational_level:
              formData.databaseRole === "admin"
                ? null
                : formData.educationalLevel,
            department:
              formData.databaseRole === "admin" ? null : formData.department,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Profile update error:", updateError);
          return {
            error: `Failed to update profile: ${updateError.message}`,
            success: false,
          };
        }

        console.log("Profile updated successfully for role switch");
        const redirectUrl =
          formData.databaseRole === "admin" ? "/admin/dashboard" : "/dashboard";
        return {
          error: null,
          success: true,
          redirect: redirectUrl,
        };
      }

      // Same role - just redirect to appropriate dashboard
      console.log("Profile already exists with same role, redirecting");
      const redirectUrl =
        formData.databaseRole === "admin" ? "/admin/dashboard" : "/dashboard";
      return {
        error: null,
        success: true,
        redirect: redirectUrl,
      };
    }

    // Insert new profile
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId, // Use id as PRIMARY KEY
      full_name: formData.fullName,
      database_role: formData.databaseRole,
      visual_role:
        formData.databaseRole === "admin" ? "Staff" : formData.visualRole,
      educational_level:
        formData.databaseRole === "admin" ? null : formData.educationalLevel,
      department:
        formData.databaseRole === "admin" ? null : formData.department,
      is_anonymous: false,
    });

    if (insertError) {
      console.error("Profile insert error:", insertError);
      return {
        error: `Failed to create profile: ${insertError.message}`,
        success: false,
      };
    }

    console.log("Profile created successfully");

    // Determine redirect URL
    const redirectUrl =
      formData.databaseRole === "admin" ? "/welcome-admin" : "/welcome-user";

    return {
      error: null,
      success: true,
      redirect: redirectUrl,
    };
  } catch (error) {
    console.error("=== SERVER ACTION ERROR ===", error);
    return {
      error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
