"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient()!;

  useEffect(() => {
    // Quick auth check - this should be fast since middleware handles the main logic
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // User is authenticated, redirect to appropriate dashboard
          const userRole = session.user.app_metadata?.role || "user";
          const redirectUrl =
            userRole === "admin" ? "/admin/dashboard" : "/dashboard";
          router.replace(redirectUrl);
        } else {
          // User is not authenticated, redirect to login
          router.replace("/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Fallback to login on error
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to prevent flickering if middleware redirects
    const timer = setTimeout(checkAuth, 100);

    return () => clearTimeout(timer);
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900">
            Maintenance Facility Management
          </h1>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // This should not be reached due to redirects, but provide a fallback
  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Maintenance Facility Management
        </h1>
        <p className="text-gray-600 mt-2">Redirecting...</p>
      </div>
    </div>
  );
}
