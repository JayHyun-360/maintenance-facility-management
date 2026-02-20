"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminAccess } from "@/components/AdminAccess";
import { UserPortal } from "@/components/UserPortal";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [adminGoogleLoading, setAdminGoogleLoading] = useState(false);
  const [userGoogleLoading, setUserGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Maintenance Facility Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose your access path below
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error === "auth_callback_error"
                ? "Authentication failed. Please try again."
                : "An error occurred during authentication."}
            </AlertDescription>
          </Alert>
        )}

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Admin Access</TabsTrigger>
            <TabsTrigger value="guest">Guest/User Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="space-y-6">
            <AdminAccess
              adminGoogleLoading={adminGoogleLoading}
              emailLoading={emailLoading}
              setAdminGoogleLoading={setAdminGoogleLoading}
              setEmailLoading={setEmailLoading}
              setFormError={setFormError}
            />
          </TabsContent>

          <TabsContent value="guest" className="space-y-6">
            <UserPortal
              userGoogleLoading={userGoogleLoading}
              guestLoading={guestLoading}
              setUserGoogleLoading={setUserGoogleLoading}
              setGuestLoading={setGuestLoading}
              setFormError={setFormError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login page...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
