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
import { signInWithGoogle, signInAsGuest } from "@/actions/auth";

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

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  const handleGoogleSignIn = async () => {
    setUserGoogleLoading(true);
    setFormError(null);

    const result = await signInWithGoogle("/dashboard", "User");

    if (result.error) {
      setFormError(result.error);
    }
    setUserGoogleLoading(false);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!guestName || !guestVisualRole) {
        setFormError("Name and visual role are required");
        return;
      }
      setFormError(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2
      if (guestEducationLevel === "College" && !guestDepartment) {
        setFormError("Department is required for College education level");
        return;
      }
      setFormError(null);
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestLoading(true);
    setFormError(null);

    // Final validation
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="guest-name">Name *</Label>
              <Input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="guest-visual-role">Visual Role *</Label>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="guest-education">
                Education Level (Optional)
              </Label>
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Review Your Information</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Name:</strong> {guestName}
                </p>
                <p>
                  <strong>Visual Role:</strong> {guestVisualRole}
                </p>
                {guestEducationLevel && (
                  <p>
                    <strong>Education Level:</strong> {guestEducationLevel}
                  </p>
                )}
                {guestDepartment && (
                  <p>
                    <strong>Department:</strong> {guestDepartment}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Click "Continue as Guest" to proceed with the above information.
            </p>
          </div>
        );

      default:
        return null;
    }
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

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 1
                ? "bg-[#006633] text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 mx-2 ${
              currentStep >= 2 ? "bg-[#006633]" : "bg-gray-200"
            }`}
          />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 2
                ? "bg-[#006633] text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            2
          </div>
          <div
            className={`flex-1 h-1 mx-2 ${
              currentStep >= 3 ? "bg-[#006633]" : "bg-gray-200"
            }`}
          />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 3
                ? "bg-[#006633] text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            3
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-gray-600">
          <span className="text-center">Basic Info</span>
          <span className="text-center">Education</span>
          <span className="text-center">Review</span>
        </div>

        <form
          onSubmit={
            currentStep === 3
              ? handleGuestLogin
              : (e) => {
                  e.preventDefault();
                  handleNextStep();
                }
          }
          className="space-y-4"
        >
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                className="flex-1"
              >
                Previous
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="submit"
                className="flex-1 bg-[#006633] hover:bg-[#004d26] text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={guestLoading}
                className="flex-1 bg-[#006633] hover:bg-[#004d26] text-white"
              >
                {guestLoading ? "Signing in..." : "Continue as Guest"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
