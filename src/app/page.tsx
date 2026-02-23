"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated and redirect appropriately
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Redirect to login if not authenticated
          window.location.href = "/login";
        } else {
          // For authenticated users, redirect based on role
          const jwt = session.access_token;
          const payload = JSON.parse(atob(jwt.split(".")[1]));
          const userRole = payload.app_metadata?.role || "user";

          // Redirect to appropriate dashboard
          const redirectUrl =
            userRole === "admin" ? "/admin/dashboard" : "/dashboard";
          window.location.href = redirectUrl;
        }
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
