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

async function UserDashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await getUserProfile(user.id);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Request</CardTitle>
                <CardDescription>
                  Create a new maintenance request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">New Request</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>
                  View and track your maintenance requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Requests
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facility Status</CardTitle>
                <CardDescription>
                  Check current facility status and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Status
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Profile Update Form - Only show if visual_role is NULL */}
          {profile && !profile.visual_role && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Profile</CardTitle>
                  <CardDescription>
                    Please provide additional information to complete your
                    profile
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
                          <SelectItem value="High School">
                            High School
                          </SelectItem>
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
          )}

          {/* Current Profile Information */}
          {profile && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-sm text-gray-900">{profile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Visual Role
                      </p>
                      <p className="text-sm text-gray-900">
                        {profile.visual_role || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Education Level
                      </p>
                      <p className="text-sm text-gray-900">
                        {profile.educational_level || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Department
                      </p>
                      <p className="text-sm text-gray-900">
                        {profile.department || "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Portal - Request Status */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>My Requests Status</CardTitle>
                <CardDescription>
                  Track the status of your maintenance requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg font-medium mb-2">No requests yet</p>
                  <p className="text-sm">
                    Submit your first maintenance request to get started
                  </p>
                  <Button className="mt-4">Create Your First Request</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <UserDashboardContent />
    </Suspense>
  );
}
