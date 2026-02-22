import { createClient as createSupabaseClient } from "@/lib/supabase/client";

export async function completeFirstLogin(userId: string) {
  const supabase = createSupabaseClient();

  try {
    // Call the database function to mark first login as completed
    const { data, error } = await supabase.rpc("complete_first_login", {
      user_id: userId,
    });

    if (error) {
      console.error("Error completing first login:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error completing first login:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getUserLoginStatus(userId: string) {
  const supabase = createSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_login_completed, user_type, login_count")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting user login status:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        firstLoginCompleted: data?.first_login_completed || false,
        userType: data?.user_type || "guest",
        loginCount: data?.login_count || 0,
      },
    };
  } catch (error) {
    console.error("Unexpected error getting user login status:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
