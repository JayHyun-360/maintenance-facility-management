"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient()!;

  useEffect(() => {
    // Simple auth check - let middleware handle server-side redirects
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Let middleware handle server-side redirects to avoid race conditions
          console.log("No session found - middleware will handle redirect");
        }
        // For authenticated users, middleware will handle the redirect
      } catch (error) {
        console.error("Auth check error:", error);
        // Fallback to login on error
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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
