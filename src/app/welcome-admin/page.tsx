"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WelcomeAdmin() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Get user's full name from metadata or profile
          const fullName =
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Admin";
          setUserName(fullName);

          // Create admin profile if it doesn't exist
          try {
            const { error: profileError } = await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                full_name: fullName,
                database_role: "admin",
                visual_role: "Staff",
                educational_level: null,
                department: null,
                is_anonymous: false,
              });

            if (profileError) {
              console.error("Admin profile creation error:", profileError);
            }
          } catch (err) {
            console.error("Admin profile creation exception:", err);
          }
        } else {
          // Redirect to login if not authenticated
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleGoManage = () => {
    router.push("/admin/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-gray-600">
            Your admin account has been successfully created. You're ready to
            manage the Maintenance Facility system.
          </p>
        </div>

        <button
          onClick={handleGoManage}
          className="w-full bg-blue-500 text-white rounded-lg py-3 px-6 font-medium hover:bg-blue-600 transition-colors"
        >
          Go Manage Now
        </button>
      </div>
    </div>
  );
}
