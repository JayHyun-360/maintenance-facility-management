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

    // Check if user is authenticated with retry logic
    const checkAuth = async () => {
      try {
        console.log("=== PROFILE CREATION SESSION CHECK ===");

        // Wait longer for session to be available and stable
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try multiple times to get session with detailed logging
        let session = null;
        for (let i = 0; i < 3; i++) {
          console.log(`Session attempt ${i + 1}/3`);
          const result = await supabase.auth.getSession();
          console.log(`Session result ${i + 1}:`, result);

          if (result.data?.session) {
            session = result.data.session;
            console.log(`Session found on attempt ${i + 1}:`, {
              userId: session.user.id,
              email: session.user.email,
              expiresAt: session.expires_at,
              hasAccessToken: !!session.access_token,
              hasRefreshToken: !!session.refresh_token,
            });
            break;
          } else {
            console.log(`No session on attempt ${i + 1}, error:`, result.error);
          }

          // Wait between attempts
          if (i < 2) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        if (!session) {
          console.error("=== NO SESSION FOUND AFTER ALL ATTEMPTS ===");
          console.log("Redirecting to login due to no session");
          router.push("/login");
          return;
        }

        console.log("=== SESSION VALIDATION SUCCESSFUL ===");
        console.log("Session found in profile creation:", session.user.email);

        // Check if profile already exists (shouldn't happen but handle gracefully)
        console.log("Checking for existing profile...");
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, user_id, database_role, full_name")
          .eq("user_id", session.user.id)
          .maybeSingle();

        console.log("Existing profile check result:", {
          existingProfile,
          profileError,
        });

        if (existingProfile) {
          console.log("Profile already exists, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }

        console.log("=== PROFILE CREATION READY ===");
      } catch (error) {
        console.error("=== ERROR IN SESSION CHECK ===", error);
        router.push("/login");
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
      console.log("=== PROFILE CREATION SUBMISSION START ===");

      // Get current session (more reliable than getUser for PKCE flow)
      console.log("Getting session for profile creation...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No session found during profile creation submission");
        throw new Error("User not authenticated");
      }

      console.log("Session found for profile creation:", {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at,
      });

      // Create profile in database using user_id field
      console.log("Creating profile with data:", {
        user_id: session.user.id,
        full_name: fullName,
        database_role: role,
        visual_role: role === "admin" ? "Staff" : profileData.visualRole,
        educational_level:
          role === "admin" ? null : profileData.educationalLevel || null,
        department: role === "admin" ? null : profileData.department || null,
        is_anonymous: false,
      });

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: session.user.id, // Use user_id instead of id
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

      console.log("Profile created successfully");

      // Update user metadata
      console.log("Updating user metadata...");
      await supabase.auth.updateUser({
        data: {
          app_metadata: { role },
          user_metadata: {
            full_name: fullName,
            profile_completed: true,
          },
        },
      });

      console.log("User metadata updated successfully");

      // Wait for session to be fully updated and persisted
      console.log("Waiting for session to be fully updated...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify session is still valid after profile creation
      console.log("=== POST-CREATION SESSION VALIDATION ===");
      let finalSession = null;
      for (let i = 0; i < 3; i++) {
        console.log(`Post-creation session check ${i + 1}/3`);
        const result = await supabase.auth.getSession();
        console.log(`Post-creation session result ${i + 1}:`, result);

        if (result.data?.session) {
          finalSession = result.data.session;
          console.log(`Session validated on attempt ${i + 1}:`, {
            userId: finalSession.user.id,
            email: finalSession.user.email,
            expiresAt: finalSession.expires_at,
            hasAccessToken: !!finalSession.access_token,
            hasRefreshToken: !!finalSession.refresh_token,
          });
          break;
        } else {
          console.log(
            `No session on post-creation attempt ${i + 1}, error:`,
            result.error,
          );
        }

        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!finalSession) {
        console.error("=== SESSION LOST AFTER PROFILE CREATION ===");
        alert("Session lost. Please sign in again.");
        router.push("/login");
        return;
      }

      console.log("=== PROFILE CREATION COMPLETED SUCCESSFULLY ===");

      // Redirect to welcome screen
      const welcomeUrl = role === "admin" ? "/welcome-admin" : "/welcome-user";
      console.log("Redirecting to welcome screen:", welcomeUrl);
      router.push(welcomeUrl);
    } catch (error) {
      console.error("=== PROFILE CREATION ERROR ===", error);
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
