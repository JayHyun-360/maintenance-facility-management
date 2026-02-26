"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { switchAdminMode } from "./actions";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface ProfileSettingsClientProps {
  profile: Profile;
  isAdmin: boolean;
}

export default function ProfileSettingsClient({
  profile,
  isAdmin,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<"admin" | "user" | null>(null);

  const handleModeSwitch = async (enableAdmin: boolean) => {
    setLoading(true);
    try {
      console.log("=== SWITCHING MODE ===");
      const result = await switchAdminMode(enableAdmin);

      if (!result.success) {
        alert(`Error: ${result.error}`);
        setShowConfirm(false);
        return;
      }

      console.log("Mode switch successful, refreshing JWT session...");

      // Force the browser to fetch a fresh JWT so the middleware reads the
      // updated role (stamped by the DB trigger) without requiring re-login.
      const supabase = createClient()!;
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn("JWT refresh warning (non-fatal):", refreshError.message);
      } else {
        console.log("JWT refreshed successfully — new role active.");
      }

      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (error) {
      console.error("Mode switch error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleAdminModeSwitch = () => {
    setConfirmType("user");
    setShowConfirm(true);
  };

  const handleUserModeSwitch = () => {
    setConfirmType("admin");
    setShowConfirm(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="font-header text-xl font-semibold text-gray-900">
                Profile Settings
              </h1>
            </div>
            <button
              onClick={() => {
                if (isAdmin) {
                  router.push("/admin/dashboard");
                } else {
                  router.push("/dashboard");
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="font-header text-2xl font-bold text-gray-900 mb-6">
            Your Profile
          </h2>

          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <p className="text-lg text-gray-900">{profile.full_name}</p>
            </div>

            {/* Email (from auth) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visual Role
              </label>
              <p className="text-lg text-gray-900">
                {profile.visual_role || "Not Set"}
              </p>
            </div>

            {/* Database Role - CURRENT MODE */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Access Mode
              </label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {isAdmin ? "Administrator" : "Regular User"}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {isAdmin
                      ? "You have full access to admin dashboard"
                      : "You can submit and view maintenance requests"}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-full text-white font-semibold ${
                    isAdmin ? "bg-red-500" : "bg-green-500"
                  }`}
                >
                  {isAdmin ? "ADMIN" : "USER"}
                </div>
              </div>
            </div>

            {/* Educational Level */}
            {!isAdmin && profile.educational_level && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Educational Level
                </label>
                <p className="text-lg text-gray-900">
                  {profile.educational_level}
                </p>
              </div>
            )}

            {/* Department */}
            {!isAdmin && profile.department && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <p className="text-lg text-gray-900">{profile.department}</p>
              </div>
            )}

            {/* Theme Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme Preference
              </label>
              <p className="text-lg text-gray-900 capitalize">
                {profile.theme_preference}
              </p>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                Account created:{" "}
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switch Card */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-8 border-2 border-amber-200">
            <h3 className="font-header text-xl font-bold text-gray-900 mb-4">
              ⚙️ Access Mode Management
            </h3>
            <p className="text-gray-600 mb-6">
              As an administrator, you can switch between admin and user modes
              to test different user experiences. This will update your access
              level and redirect you to the appropriate dashboard.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Switching modes will update your profile
                and maintain your user data. You can switch back at any time.
              </p>
            </div>

            <button
              onClick={handleAdminModeSwitch}
              disabled={loading || !isAdmin}
              className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {loading ? "Switching..." : "Switch to User Mode"}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              When in user mode, you can experience the interface as regular
              users do
            </p>
          </div>
        )}

        {!isAdmin && profile.database_role === "admin" && (
          <div className="bg-white rounded-xl shadow-sm p-8 border-2 border-blue-200">
            <h3 className="font-header text-xl font-bold text-gray-900 mb-4">
              🔧 Admin Access Available
            </h3>
            <p className="text-gray-600 mb-6">
              You have admin privileges but are currently in user mode. You can
              switch back to admin mode to access the admin dashboard.
            </p>

            <button
              onClick={handleUserModeSwitch}
              disabled={loading}
              className="w-full px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:bg-gray-400 transition-colors"
            >
              {loading ? "Switching..." : "Switch to Admin Mode"}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Access the admin dashboard and maintenance management tools
            </p>
          </div>
        )}

        {!isAdmin && profile.database_role === "user" && (
          <div className="bg-white rounded-xl shadow-sm p-8 border-2 border-green-200">
            <h3 className="font-header text-xl font-bold text-gray-900 mb-4">
              📋 User Mode
            </h3>
            <p className="text-gray-600 mb-6">
              You are currently in user mode. You can submit maintenance
              requests and track their status. Contact your administrator if you
              need admin access.
            </p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
              <h4 className="text-lg font-bold text-gray-900 mb-4">
                Confirm Mode Switch
              </h4>

              {confirmType === "user" && (
                <>
                  <p className="text-gray-600 mb-6">
                    You are about to switch to <strong>User Mode</strong>. You
                    will be redirected to the user dashboard and will no longer
                    have access to admin features.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    You can switch back to admin mode from the profile settings
                    page.
                  </p>
                </>
              )}

              {confirmType === "admin" && (
                <>
                  <p className="text-gray-600 mb-6">
                    You are about to switch to <strong>Admin Mode</strong>. You
                    will be redirected to the admin dashboard with full access
                    to maintenance management tools.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    You can switch back to user mode from the profile settings
                    page.
                  </p>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModeSwitch(confirmType === "admin")}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? "Switching..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
