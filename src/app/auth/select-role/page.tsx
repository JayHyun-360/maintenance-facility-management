"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithGoogle } from "@/actions/auth";
import { Shield, User, Wrench } from "lucide-react";

export default function SelectRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next") || "/dashboard";
  const email = searchParams.get("email") || "";

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (response.ok) {
          // User is already authenticated, redirect to dashboard
          router.push(next);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();
  }, [router, next]);

  const handleRoleSelection = async (role: "admin" | "user") => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle(
        next,
        role === "admin" ? "Admin" : "User",
        true,
      );

      if (result.error) {
        setError(result.error);
      } else if ("url" in result) {
        // Redirect to Google for authentication with role selection
        window.location.href = result.url;
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Choose Your Role
            </CardTitle>
            <CardDescription>
              Select how you want to access the maintenance facility system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {email && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-600">
                  Signing in as: <strong>{email}</strong>
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={() => handleRoleSelection("user")}
                disabled={loading}
                className="w-full h-16 flex items-center justify-center gap-3"
                variant="outline"
              >
                <User className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold">User Portal</div>
                  <div className="text-sm opacity-75">
                    Submit maintenance requests, track status
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleRoleSelection("admin")}
                disabled={loading}
                className="w-full h-16 flex items-center justify-center gap-3"
              >
                <Shield className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold">Admin Dashboard</div>
                  <div className="text-sm opacity-75">
                    Manage requests, view analytics, system administration
                  </div>
                </div>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Don't have an account? Contact your system administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
