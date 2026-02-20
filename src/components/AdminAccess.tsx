"use client";

import { useState } from "react";
import { DatabaseRole } from "@/types/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from "@/actions";

interface AdminAccessProps {
  adminGoogleLoading: boolean;
  emailLoading: boolean;
  setAdminGoogleLoading: (loading: boolean) => void;
  setEmailLoading: (loading: boolean) => void;
  setFormError: (error: string | null) => void;
}

export function AdminAccess({
  adminGoogleLoading,
  emailLoading,
  setAdminGoogleLoading,
  setEmailLoading,
  setFormError,
}: AdminAccessProps) {
  // Admin signup state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");

  // Admin login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setAdminGoogleLoading(true);
    setFormError(null);

    const result = await signInWithGoogle("/admin/dashboard", "Admin");

    if (result.error) {
      setFormError(result.error);
    }
    setAdminGoogleLoading(false);
  };

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setFormError(null);

    if (!adminEmail || !adminPassword || !adminName) {
      setFormError("All fields are required");
      setEmailLoading(false);
      return;
    }

    const result = await signUpWithEmail(
      adminEmail,
      adminPassword,
      adminName,
      "Admin",
    );

    if (result.error) {
      setFormError(result.error);
    }
    setEmailLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setFormError(null);

    if (!loginEmail || !loginPassword) {
      setFormError("Email and password are required");
      setEmailLoading(false);
      return;
    }

    const result = await signInWithEmail(loginEmail, loginPassword);

    if (result.error) {
      setFormError(result.error);
    }
    setEmailLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
        <CardDescription>
          Access the administrative interface for facility management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* Google Sign-In Button - NOT inside a form */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={adminGoogleLoading}
            className="w-full bg-[#006633] hover:bg-[#004d26] text-white"
          >
            {adminGoogleLoading
              ? "Signing in..."
              : "Sign in with Google (Admin)"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-login-email">Email</Label>
                <Input
                  id="admin-login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin-login-password">Password</Label>
                <Input
                  id="admin-login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-[#006633] hover:bg-[#004d26] text-white"
              >
                {emailLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleAdminSignUp} className="space-y-4">
              <div>
                <Label htmlFor="admin-signup-name">Full Name</Label>
                <Input
                  id="admin-signup-name"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin-signup-email">Email</Label>
                <Input
                  id="admin-signup-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin-signup-password">Password</Label>
                <Input
                  id="admin-signup-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-[#006633] hover:bg-[#004d26] text-white"
              >
                {emailLoading ? "Creating account..." : "Create Admin Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
