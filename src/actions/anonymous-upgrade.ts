import { createClient } from "@/lib/supabase/client";
import { z } from "zod";

// Schema for linking email to anonymous user
const LinkEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function linkEmailToAnonymousUser(email: string) {
  const supabase = await createClient();
  
  try {
    // Get current user (should be anonymous)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user is actually anonymous
    const isAnonymous = user.user_metadata?.is_anonymous === true;
    if (!isAnonymous) {
      return { success: false, error: "Only anonymous users can link email addresses" };
    }

    // Link email to anonymous user
    const { data, error } = await supabase.auth.updateUser({
      email: email,
    });

    if (error) {
      console.error("Error linking email:", error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data: { 
        message: "Email linked successfully! Please check your email to verify your account.",
        email: email 
      } 
    };

  } catch (error) {
    console.error("Unexpected error linking email:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function setPasswordForAnonymousUser(password: string) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user has verified email (required for password)
    if (!user.email) {
      return { success: false, error: "Please verify your email address before setting a password" };
    }

    // Set password for user
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Error setting password:", error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data: { 
        message: "Password set successfully! Your account is now permanent.",
        isNowPermanent: true 
      } 
    };

  } catch (error) {
    console.error("Unexpected error setting password:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
