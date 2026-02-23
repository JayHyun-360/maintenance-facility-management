"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DatabaseRole, VisualRole } from "@/types/database";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DatabaseRole>("user");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestData, setGuestData] = useState({
    fullName: "",
    visualRole: "Student" as VisualRole,
    educationalLevel: "",
    department: "",
  });

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            database_role: selectedRole,
          },
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        if (error.message.includes("provider is not enabled")) {
          alert(
            "Google sign-in is not configured. Please contact administrator.",
          );
        } else if (error.message.includes("access_denied")) {
          alert(
            "Access denied. Please try again or use a different sign-in method.",
          );
        } else {
          alert(`Sign-in error: ${error.message}`);
        }
        return;
      }
    } catch (error) {
      console.error("Unexpected Google sign in error:", error);
      alert("An unexpected error occurred during sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestSignIn = async () => {
    setLoading(true);
    try {
      // Create temporary test session based on selected role
      const testSessionData =
        selectedRole === "admin"
          ? {
              full_name: "Admin Test User",
              database_role: "admin",
              visual_role: "Staff",
              is_anonymous: true,
              is_test_account: true,
            }
          : {
              full_name: "User Test User",
              database_role: "user",
              visual_role: "Teacher",
              is_anonymous: true,
              is_test_account: true,
            };

      // Store test session in sessionStorage for dashboard access
      sessionStorage.setItem("testSession", JSON.stringify(testSessionData));

      // Redirect to appropriate dashboard immediately (no database storage needed)
      window.location.href =
        selectedRole === "admin" ? "/admin/dashboard" : "/dashboard";
    } catch (error) {
      console.error("Test sign in error:", error);
      alert("Error setting up test account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (!guestData.fullName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (
      guestData.educationalLevel === "College" &&
      !guestData.department.trim()
    ) {
      alert("Department is required for College level");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: guestData.fullName,
            database_role: selectedRole,
            visual_role: guestData.visualRole,
            educational_level: guestData.educationalLevel || null,
            department: guestData.department || null,
            is_anonymous: true,
          },
        },
      });

      if (error) {
        console.error("Guest auth error:", error);
        if (error.message.includes("rate limit")) {
          alert(
            "Too many sign-in attempts. Please wait a moment and try again.",
          );
        } else {
          alert(`Guest sign-in error: ${error.message}`);
        }
        return;
      }

      // CRITICAL: Update user metadata to ensure role is set
      if (data.user) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { app_metadata: { role: selectedRole } },
        });

        if (updateError) {
          console.error("Role metadata update error:", updateError);
          // Don't block sign-in, but log the error
        }
      }
    } catch (error) {
      console.error("Unexpected guest sign in error:", error);
      alert(
        "An unexpected error occurred during guest sign-in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      {/* Login Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Maintenance Portal
        </h1>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Login Role
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRole("user")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                selectedRole === "user"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              User
            </button>
            <button
              onClick={() => setSelectedRole("admin")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                selectedRole === "admin"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Google Sign-In Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Google Account
          </h3>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{loading ? "Signing in..." : "Continue with Google"}</span>
          </button>
        </div>

        {/* Guest Sign-In Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Guest Account
          </h3>
          <button
            onClick={() => setShowGuestModal(true)}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 rounded-lg py-3 px-4 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Continue as Guest
          </button>
        </div>

        {/* Test Account Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Test Account
          </h3>
          <button
            onClick={handleTestSignIn}
            disabled={loading}
            className="w-full bg-green-100 text-green-800 rounded-lg py-3 px-4 font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            Continue with Test Account
          </button>
        </div>
      </div>

      {/* Guest Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Guest Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={guestData.fullName}
                  onChange={(e) =>
                    setGuestData({ ...guestData, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visual Role
                </label>
                <select
                  value={guestData.visualRole}
                  onChange={(e) =>
                    setGuestData({
                      ...guestData,
                      visualRole: e.target.value as VisualRole,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Teacher">Teacher</option>
                  <option value="Staff">Staff</option>
                  <option value="Student">Student</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Educational Level
                </label>
                <select
                  value={guestData.educationalLevel}
                  onChange={(e) =>
                    setGuestData({
                      ...guestData,
                      educationalLevel: e.target.value,
                      department: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Level</option>
                  <option value="Elementary">Elementary</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                </select>
              </div>

              {guestData.educationalLevel === "College" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={guestData.department}
                    onChange={(e) =>
                      setGuestData({ ...guestData, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your department"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGuestModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGuestSignIn}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
