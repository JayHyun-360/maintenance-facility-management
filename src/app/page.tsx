"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated and redirect appropriately
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Get user role from JWT
        const jwt = session.access_token;
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        const userRole = payload.app_metadata?.role || "user";

        // Redirect based on role
        if (userRole === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        // Redirect to login if not authenticated
        window.location.href = "/login";
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFFD3] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900">
          Maintenance Facility Management
        </h1>
        <p className="text-gray-600 mt-2">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
