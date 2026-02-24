"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient()!;

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("=== CLIENT-SIDE AUTH CALLBACK ===");

      // Get the full URL including fragments
      const fullUrl = window.location.href;
      const url = new URL(fullUrl);

      console.log("Full URL:", fullUrl);
      console.log("Hash:", url.hash);
      console.log("Search params:", Object.fromEntries(searchParams.entries()));

      // For PKCE flow, we need to explicitly handle the OAuth callback
      // Check if we have OAuth code in URL
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      console.log("OAuth code:", code);
      console.log("OAuth error:", error);

      if (error) {
        console.error("OAuth error:", error);
        router.push(`/auth/error?message=${encodeURIComponent(error)}`);
        return;
      }

      if (code) {
        // Exchange code for session
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Error exchanging code for session:", exchangeError);
          const exchangeErrorMessage =
            typeof exchangeError === "string"
              ? exchangeError
              : (exchangeError as any)?.message || "Unknown error";
          router.push(
            `/auth/error?message=${encodeURIComponent(exchangeErrorMessage)}`,
          );
          return;
        }

        console.log("Session exchanged successfully:", data.session);

        if (data.session) {
          // Get user to determine role and redirect
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            console.log("User authenticated:", userData.user.email);

            // Determine user role based on email
            const email = userData.user.email || "";
            const isAdmin =
              email.includes("@admin") || email.includes("yourdomain.com");

            // Check if profile exists
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", userData.user.id)
              .single();

            if (profile) {
              // Existing user - redirect to dashboard
              const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
              router.push(redirectUrl);
            } else {
              // New user - redirect to profile creation
              const profileCreationUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${userData.user.user_metadata?.full_name || email.split("@")[0]}`;
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

        // Get user to determine role and redirect
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          console.log("User authenticated:", userData.user.email);

          // Determine user role based on email
          const email = userData.user.email || "";
          const isAdmin =
            email.includes("@admin") || email.includes("yourdomain.com");

          // Check if profile exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userData.user.id)
            .single();

          if (profile) {
            // Existing user - redirect to dashboard
            const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
            router.push(redirectUrl);
          } else {
            // New user - redirect to profile creation
            const profileCreationUrl = `/profile-creation?role=${isAdmin ? "admin" : "user"}&name=${userData.user.user_metadata?.full_name || email.split("@")[0]}`;
            router.push(profileCreationUrl);
          }
        }
      } else {
        console.log("No session found after callback");
        router.push("/auth/error?message=No authentication parameters found");
      }
    };

    handleAuthCallback();
  }, [router, searchParams, supabase]);

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

export default function AuthCallback() {
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
      <AuthCallbackContent />
    </Suspense>
  );
}
