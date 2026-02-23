import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidEmail, sanitizeEmail, extractDomain } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams, origin, hash } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Parse URL fragment for access token (Supabase OAuth returns tokens in fragments)
  let accessToken = searchParams.get("access_token");
  let refreshToken = searchParams.get("refresh_token");
  let databaseRole = searchParams.get("database_role");

  // If not in query params, parse from URL fragment
  if (!accessToken && hash) {
    const fragmentParams = new URLSearchParams(hash.slice(1)); // Remove # and parse
    accessToken = fragmentParams.get("access_token");
    refreshToken = fragmentParams.get("refresh_token");
    databaseRole = fragmentParams.get("database_role");
  }

  const supabase = await createServerClient();
  let error = null;

  console.log("Auth callback received:", {
    hasCode: !!code,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hash: hash ? "present" : "absent",
  });

  // Helper function to determine if user should be admin
  const determineUserRole = (email: string): "admin" | "user" => {
    if (!email || !isValidEmail(email)) {
      console.warn("Invalid email provided for role determination:", email);
      return "user";
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Define admin domains and emails from environment variables
    const adminDomains = (process.env.ADMIN_DOMAINS || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => isValidEmail(e));

    const domain = extractDomain(sanitizedEmail);

    // Check if email domain is in admin domains
    if (domain && adminDomains.includes(domain)) {
      console.log(
        `Admin role assigned to ${sanitizedEmail} via domain: ${domain}`,
      );
      return "admin";
    }

    // Check if specific email is in admin emails
    if (adminEmails.includes(sanitizedEmail)) {
      console.log(
        `Admin role assigned to ${sanitizedEmail} via explicit email`,
      );
      return "admin";
    }

    return "user";
  };

  // Handle authorization code flow (preferred)
  if (code) {
    console.log("Processing authorization code flow...");
    const { error: exchangeError, data } =
      await supabase.auth.exchangeCodeForSession(code);
    error = exchangeError;
    if (data) {
      console.log("Code exchange successful:", data);
    }
  }
  // Handle implicit flow with access token (fallback)
  else if (accessToken) {
    console.log("Processing implicit flow with access token...");
    const { error: sessionError, data } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });
    error = sessionError;
    if (data) {
      console.log("Session set successful:", data);
    }
  } else {
    console.log("No code or access token found in callback");
    console.log("Full URL:", request.url);
    console.log("Search params:", Object.fromEntries(searchParams.entries()));
    console.log("Hash:", hash);
    error = { message: "No authentication parameters found" };
  }

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message || "Unknown error")}`,
    );
  }

  // Get user and check if profile exists
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log("User found:", user.email);

    // Determine user role based on email
    const role = determineUserRole(user.email || "");
    console.log("User role determined:", role);

    // Update user metadata with role
    await supabase.auth.updateUser({
      data: { app_metadata: { role } },
    });

    // Check if profile exists
    try {
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, visual_role, educational_level, department")
        .eq("id", user.id)
        .single();

      if (profileError || !existingProfile) {
        console.log("Profile not found, redirecting to profile creation");
        // New user - redirect to profile creation
        const profileCreationUrl = new URL("/profile-creation", origin);
        profileCreationUrl.searchParams.set("role", role);
        profileCreationUrl.searchParams.set(
          "name",
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        );
        return NextResponse.redirect(profileCreationUrl);
      }

      console.log("Profile found, redirecting to dashboard");
      // Existing user - redirect to dashboard
      const redirectUrl = role === "admin" ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(`${origin}${redirectUrl}`);
    } catch (err) {
      console.error("Profile check error:", err);
      // If profile check fails, assume new user and redirect to profile creation
      const profileCreationUrl = new URL("/profile-creation", origin);
      profileCreationUrl.searchParams.set("role", role);
      profileCreationUrl.searchParams.set(
        "name",
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      );
      return NextResponse.redirect(profileCreationUrl);
    }
  }

  // Log error for debugging
  console.error("No user found after authentication");
  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent("User not found")}`,
  );
}
