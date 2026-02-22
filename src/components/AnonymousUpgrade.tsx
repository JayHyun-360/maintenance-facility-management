"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock, UserCheck, AlertCircle } from "lucide-react";
import {
  linkEmailToAnonymousUser,
  setPasswordForAnonymousUser,
} from "@/actions/anonymous-upgrade";

interface AnonymousUpgradeProps {
  currentEmail?: string | null;
  onUpgradeComplete?: () => void;
}

export function AnonymousUpgrade({
  currentEmail,
  onUpgradeComplete,
}: AnonymousUpgradeProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "password" | "complete">("email");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await linkEmailToAnonymousUser(email);

    if (result.success) {
      setSuccess(result.data?.message || "Email linked successfully!");
      setStep("password");
    } else {
      setError(result.error || "Failed to link email");
    }

    setLoading(false);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await setPasswordForAnonymousUser(password);

    if (result.success) {
      setSuccess(result.data?.message || "Password set successfully!");
      setStep("complete");
      onUpgradeComplete?.();
    } else {
      setError(result.error || "Failed to set password");
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Link Your Account
        </CardTitle>
        <CardDescription>
          Convert your guest session to a permanent account by linking your
          email and setting a password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <UserCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {step === "email" && (
          <form onSubmit={handleLinkEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Linking..." : "Link Email"}
              <Mail className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting Password..." : "Set Password"}
              <Lock className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {step === "complete" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Account Upgraded!
              </h3>
              <p className="text-gray-600">
                Your guest session has been converted to a permanent account.
                You can now sign in with your email and password.
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              Continue
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
