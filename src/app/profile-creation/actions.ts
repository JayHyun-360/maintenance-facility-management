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
  const isAnonymousUser = session.user.user_metadata?.is_anonymous === true;

  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, database_role")
      .eq("id", userId)
      .maybeSingle();

    if (checkError) {
      return {
        error: "Failed to check existing profile",
        success: false,
      };
    }

    if (existingProfile) {
      // Profile exists - check if this is a role switch scenario
      // If current role is different from requested role, allow update
      if (existingProfile.database_role !== formData.databaseRole) {
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
            is_anonymous: isAnonymousUser,
            theme_preference: "system", // Fix theme_preference constraint error
          })
          .eq("id", userId);

        if (updateError) {
          return {
            error: `Failed to update profile: ${updateError.message}`,
            success: false,
          };
        }

        const redirectUrl =
          formData.databaseRole === "admin" ? "/admin/dashboard" : "/dashboard";
        return {
          error: null,
          success: true,
          redirect: redirectUrl,
        };
      }

      // Same role - just redirect to appropriate dashboard
      const redirectUrl =
        formData.databaseRole === "admin" ? "/admin/dashboard" : "/dashboard";
      return {
        error: null,
        success: true,
        redirect: redirectUrl,
      };
    }

    // Insert new profile - use upsert to handle potential trigger race conditions
    // The trigger might have partially created a profile, so we use upsert to be safe
    console.log("=== PROFILE INSERT/UPSERT ATTEMPT ===");
    console.log("User ID:", userId);
    console.log("Full Name:", formData.fullName);
    console.log("Database Role:", formData.databaseRole);
    console.log(
      "Visual Role:",
      formData.databaseRole === "admin" ? "Staff" : formData.visualRole,
    );
    console.log("Is Anonymous:", isAnonymousUser);
    console.log("Theme Preference:", "system");

    const insertData = {
      id: userId,
      full_name: formData.fullName,
      database_role: formData.databaseRole,
      visual_role:
        formData.databaseRole === "admin" ? "Staff" : formData.visualRole,
      educational_level:
        formData.databaseRole === "admin" ? null : formData.educationalLevel,
      department:
        formData.databaseRole === "admin" ? null : formData.department,
      is_anonymous: isAnonymousUser,
      theme_preference: "system" as const,
    };

    console.log("Insert Data:", JSON.stringify(insertData, null, 2));

    // Use upsert instead of insert to handle potential trigger race conditions
    const { error: insertError } = await supabase
      .from("profiles")
      .upsert(insertData, { onConflict: "id" });

    if (insertError) {
      console.error("=== PROFILE INSERT ERROR ===");
      console.error("Error details:", JSON.stringify(insertError, null, 2));
      return {
        error: `Failed to create profile: ${insertError.message}`,
        success: false,
      };
    }

    // Determine redirect URL
    const redirectUrl =
      formData.databaseRole === "admin" ? "/welcome-admin" : "/welcome-user";

    return {
      error: null,
      success: true,
      redirect: redirectUrl,
    };
  } catch (error) {
    return {
      error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
