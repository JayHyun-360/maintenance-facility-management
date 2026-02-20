"use client";

import { useState } from "react";
import { VisualRole, GuestUser } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signInWithGoogle, signInAsGuest } from "@/actions";

interface UserPortalProps {
  userGoogleLoading: boolean;
  guestLoading: boolean;
  setUserGoogleLoading: (loading: boolean) => void;
  setGuestLoading: (loading: boolean) => void;
  setFormError: (error: string | null) => void;
}

export function UserPortal({
  userGoogleLoading,
  guestLoading,
  setUserGoogleLoading,
  setGuestLoading,
  setFormError,
}: UserPortalProps) {
  // Guest login state
  const [guestName, setGuestName] = useState("");
  const [guestVisualRole, setGuestVisualRole] = useState<VisualRole | null>(
    null,
  );
  const [guestEducationLevel, setGuestEducationLevel] = useState("");
  const [guestDepartment, setGuestDepartment] = useState("");

  const handleGoogleSignIn = async () => {
    setUserGoogleLoading(true);
    setFormError(null);

    const result = await signInWithGoogle("/dashboard", "User");

    if (result.error) {
      setFormError(result.error);
    }
    setUserGoogleLoading(false);
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestLoading(true);
    setFormError(null);

    if (!guestName || !guestVisualRole) {
      setFormError("Name and visual role are required");
      setGuestLoading(false);
      return;
    }

    if (guestEducationLevel === "College" && !guestDepartment) {
      setFormError("Department is required for College education level");
      setGuestLoading(false);
      return;
    }

    const guestData: GuestUser = {
      name: guestName,
      visual_role: guestVisualRole,
      educational_level: guestEducationLevel || undefined,
      department: guestDepartment || undefined,
    };

    const result = await signInAsGuest(guestData);

    if (result.error) {
      setFormError(result.error);
    }
    setGuestLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest/User Portal</CardTitle>
        <CardDescription>
          Access the user portal for facility requests and viewing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Sign-In Button - NOT inside a form */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={userGoogleLoading}
          className="w-full bg-[#006633] hover:bg-[#004d26] text-white"
        >
          {userGoogleLoading ? "Signing in..." : "Sign in with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue as guest
            </span>
          </div>
        </div>

        <form onSubmit={handleGuestLogin} className="space-y-4">
          <div>
            <Label htmlFor="guest-name">Name</Label>
            <Input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="guest-visual-role">Visual Role</Label>
            <Select
              value={guestVisualRole || ""}
              onValueChange={(value: VisualRole) => setGuestVisualRole(value)}
            >
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
            <Label htmlFor="guest-education">Education Level (Optional)</Label>
            <Select
              value={guestEducationLevel}
              onValueChange={setGuestEducationLevel}
            >
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

          {guestEducationLevel === "College" && (
            <div>
              <Label htmlFor="guest-department">
                Department (Required for College)
              </Label>
              <Input
                id="guest-department"
                type="text"
                value={guestDepartment}
                onChange={(e) => setGuestDepartment(e.target.value)}
                required={guestEducationLevel === "College"}
                placeholder="e.g., Computer Science, Engineering, etc."
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={guestLoading}
            className="w-full bg-[#006633] hover:bg-[#004d26] text-white"
          >
            {guestLoading ? "Signing in..." : "Continue as Guest"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
