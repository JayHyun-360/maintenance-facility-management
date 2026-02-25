"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthCallbackClientProps {
  searchParams: {
    code?: string;
    error?: string;
    error_description?: string;
    next?: string;
  };
}

function AuthCallbackContent({ searchParams }: AuthCallbackClientProps) {
  const router = useRouter();
  const searchParamsClient = useSearchParams();
  const supabase = createClient()!;

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("=== CLIENT-SIDE AUTH CALLBACK (FALLBACK) ===");

      // Get the full URL including fragments
      const fullUrl = window.location.href;
      const url = new URL(fullUrl);

      console.log("Full URL:", fullUrl);
      console.log("Hash:", url.hash);
      console.log(
        "Search params:",
        Object.fromEntries(searchParamsClient.entries()),
      );

      // Check if we have OAuth code in URL
      const code = searchParamsClient.get("code");
      const error = searchParamsClient.get("error");
      const errorDescription = searchParamsClient.get("error_description");

      console.log("OAuth code:", code);
      console.log("OAuth error:", error);
      console.log("OAuth error description:", errorDescription);

      if (error) {
        console.error("OAuth error from server:", error, errorDescription);
        // The server-side callback already handled the error, just show it
        return;
      }

      if (code) {
        console.log("Code found, checking if server already handled it...");

        // Check if we already have a session (server-side callback should have set this)
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error checking session:", sessionError);
          router.push(
            `/auth/error?message=${encodeURIComponent(`Session check failed: ${sessionError.message}`)}`,
          );
          return;
        }

        if (sessionData?.session) {
          console.log("Session found from server-side callback!");
          console.log("Session user ID:", sessionData.session.user.id);
          console.log("Session user email:", sessionData.session.user.email);

          // The server-side callback should have already redirected, but as a fallback:
          // Use profile DB role as source of truth at login time.
          const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("database_role")
            .eq("id", sessionData.session.user.id)
            .maybeSingle();

          const fallbackRole =
            (fallbackProfile as { database_role: string } | null)
              ?.database_role || sessionData.session.user.app_metadata?.role;
          const isAdmin = fallbackRole === "admin";
          const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";

          console.log("Fallback redirect to:", redirectUrl);
          router.push(redirectUrl);
          return;
        }

        // If no session and we have a code, try client-side exchange as fallback
        console.log(
          "No session found, trying client-side code exchange as fallback...",
        );
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Client-side code exchange error:", exchangeError);
          console.error(
            "Full error object:",
            JSON.stringify(exchangeError, null, 2),
          );

          // Extract detailed error information
          const errorDetails = {
            message: exchangeError.message || "Unknown error",
            status: exchangeError.status,
            code: (exchangeError as any).code || "unknown_code",
          };

          console.error("Extracted error details:", errorDetails);

          const errorParams = new URLSearchParams({
            error: errorDetails.code,
            error_description: `${errorDetails.message} (Status: ${errorDetails.status})`,
          });

          router.push(`/auth/error?${errorParams.toString()}`);
          return;
        }

        console.log("Client-side session exchange successful!");
        console.log("Session user ID:", data.session?.user.id);
        console.log("Session user email:", data.session?.user.email);
        console.log("Session user metadata:", data.session?.user.user_metadata);
        console.log("Session app metadata:", data.session?.user.app_metadata);

        if (data.session) {
          // Wait a moment for the trigger to execute
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Get user to determine role and redirect
          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError) {
            console.error("Error getting user after session:", userError);
            router.push(
              `/auth/error?message=${encodeURIComponent(`Failed to get user: ${userError.message}`)}`,
            );
            return;
          }

          if (userData.user) {
            console.log("User authenticated:", userData.user.email);
            console.log("User app_metadata:", userData.user.app_metadata);

            // Check if profile exists with detailed error handling
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id, database_role, full_name, created_at")
              .eq("id", userData.user.id)
              .single();

            console.log("Profile query result:", profile);
            console.log("Profile query error:", profileError);

            if (profileError) {
              console.error("Profile query failed:", profileError);
              console.error(
                "Full error object:",
                JSON.stringify(profileError, null, 2),
              );

              // Check if it's a schema-related error
              if (
                profileError?.message?.includes("column") ||
                profileError?.code === "42703"
              ) {
                console.error(
                  "SCHEMA MISMATCH: Column reference error detected.",
                );
                console.error(
                  "Possible cause: user_id vs id column mismatch in profiles table",
                );
              }

              // Try to debug the issue
              try {
                const { data: debugData } = await supabase.rpc(
                  "debug_user_creation",
                  {
                    user_id: userData.user.id,
                  } as any,
                );
                console.log("Debug user creation data:", debugData);
              } catch (debugError) {
                console.error("Debug function failed:", debugError);
              }

              router.push(
                `/auth/error?message=${encodeURIComponent(`Profile creation failed: ${profileError.message}`)}`,
              );
              return;
            }

            if (profile) {
              // Existing user - use database_role as source of truth, not JWT
              const isAdmin = (profile as any).database_role === "admin";
              const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
              console.log(
                "Existing user, database_role:",
                (profile as any).database_role,
                "→ redirecting to:",
                redirectUrl,
              );
              router.push(redirectUrl);
            } else {
              // New user - this shouldn't happen with the trigger, but handle it
              console.log("No profile found - trigger may have failed");
              const email = userData.user.email || "";
              const name =
                userData.user.user_metadata?.full_name || email.split("@")[0];

              const profileCreationUrl = `/profile-creation?role=user&name=${encodeURIComponent(name)}`;
              console.log(
                "New user, redirecting to profile creation:",
                profileCreationUrl,
              );
              router.push(profileCreationUrl);
            }
          }
        }
      } else {
        // Try to get existing session (for direct visits)
        const { data: sessionData, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          const errorMessage =
            typeof error === "string"
              ? error
              : (error as any)?.message || "Unknown error";
          router.push(
            `/auth/error?message=${encodeURIComponent(errorMessage)}`,
          );
          return;
        }

        if (sessionData?.session) {
          console.log("Session found:", sessionData.session);
          // Redirect to appropriate dashboard based on session
          router.push("/dashboard");
        } else {
          console.log("No session found and no OAuth code");
          router.push("/auth/error?message=No authentication parameters found");
        }
      }
    };

    handleAuthCallback();
  }, [router, searchParamsClient, supabase]);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Completing sign in...
        </h1>
        <p className="text-gray-600">
          Please wait while we set up your session.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackClient({
  searchParams,
}: AuthCallbackClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <AuthCallbackContent searchParams={searchParams} />
    </Suspense>
  );
}
