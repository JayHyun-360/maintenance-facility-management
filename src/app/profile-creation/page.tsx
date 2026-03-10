"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserProfile } from "./actions";
import type { DatabaseRole, VisualRole, ProfileInsert } from "@/types/database";

function ProfileCreationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<DatabaseRole>("user");
  const [fullName, setFullName] = useState("");
  const [profileData, setProfileData] = useState({
    visualRole: "Student" as VisualRole,
    educationalLevel: "",
    department: "",
  });

  useEffect(() => {
    const roleParam = searchParams.get("role") as DatabaseRole;
    const nameParam = searchParams.get("name");

    if (roleParam) setRole(roleParam);
    if (nameParam) setFullName(nameParam);

    // Post-OAuth flow: just extract params and let server action handle session validation
    console.log("=== PROFILE CREATION PAGE LOADED ===");
    console.log("Current URL:", window.location.href);
    console.log("URL params:", {
      role: roleParam,
      name: nameParam,
    });
    console.log("=== PROFILE CREATION READY ===");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert("Please enter your full name");
      return;
    }

    if (
      profileData.educationalLevel === "College" &&
      !profileData.department.trim()
    ) {
      alert("Department is required for College level");
      return;
    }

    setLoading(true);
    try {
      console.log("=== PROFILE CREATION SUBMISSION START ===");

      // Call server action to create profile with proper session context
      const result = await createUserProfile({
        fullName,
        databaseRole: role,
        visualRole: profileData.visualRole,
        educationalLevel: profileData.educationalLevel || null,
        department: profileData.department || null,
      });

      if (!result.success) {
        console.error("Profile creation failed:", result.error);
        alert(`Error: ${result.error}`);
        return;
      }

      console.log("=== PROFILE CREATION COMPLETED SUCCESSFULLY ===");

      // Redirect to the appropriate page
      if (result.redirect) {
        console.log("Redirecting to:", result.redirect);
        router.push(result.redirect);
      }
    } catch (error) {
      console.error("=== PROFILE CREATION ERROR ===", error);
      alert(
        `Error creating profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Creating your profile...
            </h2>
            <p className="text-gray-600">Redirecting you to Dashboard</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="font-header text-2xl font-bold text-gray-900 mb-6 text-center">
          Complete Your Profile
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          {role === "user" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visual Role
                </label>
                <select
                  value={profileData.visualRole}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
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
                  value={profileData.educationalLevel}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
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

              {profileData.educationalLevel === "College" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={profileData.department}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your department"
                    required
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white rounded-lg py-3 px-4 font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating Profile..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProfileCreation() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfileCreationContent />
    </Suspense>
  );
}
