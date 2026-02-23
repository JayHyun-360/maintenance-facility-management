"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
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

      // Let Supabase handle the session automatically from URL
      // This will parse both query params and fragments
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
          const isAdmin = email.includes("@admin") || email.includes("yourdomain.com");
          
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
        // No session found, try to get from URL manually
        console.log("No session found, attempting manual extraction...");
        
        const hash = url.hash.slice(1); // Remove #
        const fragmentParams = new URLSearchParams(hash);
        const accessToken = fragmentParams.get("access_token");
        const refreshToken = fragmentParams.get("refresh_token");

        if (accessToken) {
          console.log("Found access token in fragment, setting session...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (sessionError) {
            console.error("Error setting session:", sessionError);
            router.push(`/auth/error?message=${encodeURIComponent(sessionError.message)}`);
            return;
          }

          // Retry getting user after setting session
          window.location.reload(); // Reload to trigger the session flow again
        } else {
          console.log("No access token found in fragment");
          router.push("/auth/error?message=No authentication parameters found");
        }
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
