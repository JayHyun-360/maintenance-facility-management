import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { enableAdmin } = await request.json();
    const supabase = await createServerClient();

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({
        error: "No authenticated session",
        success: false,
      });
    }

    const userId = session.user.id;

    console.log("=== SWITCH ADMIN MODE ===");
    console.log("User ID:", userId);
    console.log("Enable Admin:", enableAdmin);

    // First, get current profile to verify permissions and preserve data
    const { data: currentProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !currentProfile) {
      console.error("Error fetching current profile:", fetchError);
      return NextResponse.json({
        error: "Profile not found",
        success: false,
      });
    }

    // SECURITY: Check if user actually has admin privileges in the database
    if (enableAdmin && currentProfile.database_role !== "admin") {
      console.error(
        "Security violation: Non-admin trying to enable admin mode",
      );
      return NextResponse.json({
        error: "You do not have admin privileges",
        success: false,
      });
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
      console.log("Preparing to switch TO admin mode");
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
      console.log("Preparing to switch TO user mode");
    }

    // Execute atomic update
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json({
        error: `Failed to switch mode: ${updateError.message}`,
        success: false,
      });
    }

    console.log("Successfully switched mode. New data:", updateData);

    return NextResponse.json({
      error: null,
      success: true,
      message: enableAdmin ? "Switched to admin mode" : "Switched to user mode",
      redirect: enableAdmin ? "/admin/dashboard" : "/dashboard",
    });
  } catch (error) {
    console.error("=== SWITCH ADMIN MODE ERROR ===", error);
    return NextResponse.json({
      error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    });
  }
}
