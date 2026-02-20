"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseRole, VisualRole, GuestUser } from "@/types/auth";

export async function signInWithGoogle(next: string = "/dashboard") {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
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
        database_role: role,
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
      name,
      email,
      database_role: role,
    });

    if (profileError) {
      return { error: profileError.message };
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

export async function signInAsGuest(guestData: GuestUser) {
  const supabase = await createClient();

  // Sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        name: guestData.name,
        visual_role: guestData.visual_role,
        educational_level: guestData.educational_level,
        department: guestData.department,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create guest profile
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name: guestData.name,
      database_role: "User",
      visual_role: guestData.visual_role,
      educational_level: guestData.educational_level,
      department: guestData.department,
    });

    if (profileError) {
      return { error: profileError.message };
    }
  }

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

  const { error } = await supabase
    .from("profiles")
    .update({
      name: profileData.name,
      visual_role: profileData.visual_role,
      educational_level: profileData.educational_level,
      department: profileData.department,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
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
