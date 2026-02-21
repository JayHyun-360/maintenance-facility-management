import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signOut, completeProfile, getUserProfile } from "@/actions/auth";
import { Suspense } from "react";
import { VisualRole } from "@/types/auth";
import { UserDashboard } from "@/components/UserDashboard";
import type { User } from "@/lib/supabase/types";

async function UserDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await getUserProfile(user.id);

  // CRITICAL FIX: Check if user is Admin - Admins bypass profile completion
  // Use correct Supabase User properties: app_metadata exists, raw_user_meta_data is user_metadata
  const isAdmin =
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.database_role === "Admin";

  // Check if profile needs completion (only for Users, not Admins)
  if (profile && !profile.visual_role && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold">
                  Maintenance Facility Management
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {profile?.name || user.email}
                </span>
                <form action={signOut}>
                  <Button type="submit" variant="outline">
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>
                  Please provide additional information to complete your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={async (formData) => {
                    "use server";

                    const name = formData.get("name") as string;
                    const visual_role = formData.get(
                      "visual_role",
                    ) as VisualRole;
                    const educational_level = formData.get(
                      "educational_level",
                    ) as string;
                    const department = formData.get("department") as string;

                    if (!name || !visual_role) {
                      throw new Error("Name and visual role are required");
                    }

                    if (educational_level === "College" && !department) {
                      throw new Error(
                        "Department is required for College education level",
                      );
                    }

                    const result = await completeProfile(user.id, {
                      name,
                      visual_role,
                      educational_level: educational_level || undefined,
                      department: department || undefined,
                    });

                    if (result.error) {
                      throw new Error(result.error);
                    }

                    redirect("/dashboard");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      name="name"
                      type="text"
                      defaultValue={profile.name || ""}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="profile-visual-role">Visual Role</Label>
                    <Select name="visual_role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="profile-education">
                      Education Level (Optional)
                    </Label>
                    <Select name="educational_level">
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="High School">High School</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="profile-department">
                      Department (Required for College)
                    </Label>
                    <Input
                      id="profile-department"
                      name="department"
                      type="text"
                      placeholder="e.g., Computer Science, Engineering, etc."
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Complete Profile
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserDashboard
      user={{ id: user.id, email: user.email || "" }}
      profile={profile}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <UserDashboardPage />
    </Suspense>
  );
}
