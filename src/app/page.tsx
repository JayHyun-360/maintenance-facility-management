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

      if (!session) {
        // Redirect to login if not authenticated
        window.location.href = "/login";
      }
      // Note: For authenticated users, middleware will handle role-based redirects
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
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
