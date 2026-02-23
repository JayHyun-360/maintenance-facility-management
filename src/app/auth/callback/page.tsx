"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("=== CLIENT-SIDE AUTH CALLBACK ===");

      // Get the full URL including fragments
      const fullUrl = window.location.href;
      const url = new URL(fullUrl);

      console.log("Full URL:", fullUrl);
      console.log("Hash:", url.hash);
      console.log("Search params:", Object.fromEntries(searchParams.entries()));

      // Wait a moment for Supabase to process the URL
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Let Supabase handle the session automatically from URL
      // This will parse both query params and fragments with PKCE flow
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        router.push(`/auth/error?message=${encodeURIComponent(error.message)}`);
        return;
      }

      if (data.session) {
        console.log("Session found:", data.session);

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
