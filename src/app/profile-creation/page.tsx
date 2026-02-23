"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

  const supabase = createClient()!;

  useEffect(() => {
    const roleParam = searchParams.get("role") as DatabaseRole;
    const nameParam = searchParams.get("name");

    if (roleParam) setRole(roleParam);
    if (nameParam) setFullName(nameParam);

    // Check if user is authenticated
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }
    };

    checkAuth();
  }, [searchParams, router]);

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
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create profile in database using insert (since user shouldn't exist yet)
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName,
        database_role: role,
        visual_role: role === "admin" ? "Staff" : profileData.visualRole,
        educational_level:
          role === "admin" ? null : profileData.educationalLevel || null,
        department: role === "admin" ? null : profileData.department || null,
        is_anonymous: false,
      } as any);

      if (profileError) {
        console.error("Profile insert error:", profileError);
        throw profileError;
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          app_metadata: { role },
          user_metadata: {
            full_name: fullName,
            profile_completed: true,
          },
        },
      });

      // Redirect to welcome screen
      const welcomeUrl = role === "admin" ? "/welcome-admin" : "/welcome-user";
      router.push(welcomeUrl);
    } catch (error) {
      console.error("Profile creation error:", error);
      alert("Error creating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
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
