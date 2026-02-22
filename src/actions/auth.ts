"use server";

// Log that auth actions are being loaded
console.log(" Auth actions module loaded");

import { createClient } from "@/lib/supabase/server";
import { verifyCaptchaDebug } from "@/lib/hcaptcha-debug";
import { z } from "zod";
import { completeFirstLogin } from "./login-tracking";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DatabaseRole, VisualRole, GuestUser } from "@/types/auth";
import { getAuthCallbackURL } from "@/lib/utils/url";

export async function signInWithGoogle(
  next: string = "/dashboard",
  role: DatabaseRole = "User",
  forceRole: boolean = false, // New parameter to force role selection
) {
  const supabase = await createClient();

  console.log("🚀 Starting Google OAuth sign-in:", { next, role, forceRole });

  // Check if Google OAuth is configured
  const googleClientId = process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.SUPABASE_GOOGLE_CLIENT_SECRET;

  if (
    !googleClientId ||
    googleClientId.includes("your_google_client_id_here") ||
    !googleClientSecret ||
    googleClientSecret.includes("your_google_client_secret_here")
  ) {
    console.error("❌ Google OAuth not configured properly");
    console.log("🔧 Current env vars:", {
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      clientIdValue: googleClientId?.substring(0, 10) + "...",
    });
    return {
      error:
        "Google OAuth is not configured. In local development, ensure NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID and SUPABASE_GOOGLE_CLIENT_SECRET are set in .env.local. In production, these should be set in your Vercel environment variables.",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackURL(next),
      queryParams: {
        role_hint: forceRole ? role.toLowerCase() : "select", // Force role or allow selection
        force_role: forceRole ? "true" : "false", // Additional parameter to force role
      },
    },
  });

  if (error) {
    console.error("❌ Google OAuth error:", error);
    return { error: error.message };
  }

  console.log("✅ Google OAuth initiated successfully:", {
    provider: data.provider,
    url: data.url,
  });

  // CRITICAL: Redirect to OAuth URL instead of returning data
  if (data.url) {
    redirect(data.url);
  }

  return { data };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: DatabaseRole,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        database_role: role.toLowerCase(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create user profile
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: name,
      email,
      database_role: role,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { error: profileError.message };
    }

    // Update JWT metadata for proper role checking
    await supabase.rpc("update_user_role", {
      user_id: data.user.id,
      new_role: role,
    });

    // Auto-authenticate after successful signup
    if (role === "Admin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { error: signInError.message };
      }

      revalidatePath("/admin/dashboard");
      return { success: true, data, redirectTo: "/admin/dashboard" };
    }
  }

  revalidatePath("/login");
  return { success: true, data };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/login");
  return { success: true, data };
}

export async function signInAsGuest(
  guestData: GuestUser,
  captchaToken?: string,
) {
  // Verify captcha token first
  if (!captchaToken) {
    return { error: "Captcha token is required" };
  }

  // Extract remote IP from headers for better verification
  const headersList = await headers();
  const remoteIp =
    headersList.get("x-forwarded-for") ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    undefined;

  const captchaResult = await verifyCaptchaDebug(captchaToken, remoteIp);
  if (!captchaResult.success) {
    return { error: captchaResult.error || "Captcha verification failed" };
  }

  const supabase = await createClient();

  // Sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        name: guestData.name,
        visual_role: guestData.visual_role,
        educational_level: guestData.educational_level,
        department: guestData.department,
        is_guest: true, // Set guest flag for trigger to handle
        captchaToken: captchaToken, // Pass hCaptcha token for logging
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Mark first login as completed for guest users
  if (captchaToken) {
    await completeFirstLogin(data.user?.id || "");
  }

  // Profile creation is now handled by sync_user_role trigger
  // No manual profile insertion needed to avoid race conditions

  revalidatePath("/login");
  return { success: true, data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function completeProfile(
  userId: string,
  profileData: {
    name: string;
    visual_role: VisualRole;
    educational_level?: string;
    department?: string;
  },
) {
  const supabase = await createClient();

  console.log("🔧 Completing profile for user:", {
    userId,
    profileData,
  });

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: profileData.name,
        visual_role: profileData.visual_role,
        educational_level: profileData.educational_level,
        department: profileData.department,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    console.log("📝 Profile update result:", {
      data,
      error,
    });

    if (error) {
      console.error("❌ Profile update error:", {
        error,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { error: error.message };
    }

    console.log("✅ Profile completed successfully:", data);
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("❌ Profile update exception:", error);
    return { error: "Failed to update profile due to server error" };
  }
}

export async function getAllProfiles() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}
