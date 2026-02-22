"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminAccess } from "@/components/AdminAccess";
import { UserPortal } from "@/components/UserPortal";
import { HCaptcha } from "@hcaptcha/react-hcaptcha";
import {
  getUserLoginStatus,
  completeFirstLogin,
} from "@/actions/login-tracking";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [adminGoogleLoading, setAdminGoogleLoading] = useState(false);
  const [userGoogleLoading, setUserGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(
    undefined,
  );
  const [showCaptcha, setShowCaptcha] = useState(true);
  const [userType, setUserType] = useState<string>("guest");

  // Check if we should show captcha based on user type and login history
  useEffect(() => {
    const checkLoginStatus = async () => {
      // For guest users, always show captcha
      // For permanent users, only show captcha on first login
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const result = await getUserLoginStatus(user.id);

        if (result.success) {
          const data = result.data;
          const firstLoginCompleted = data?.firstLoginCompleted || false;
          const currentUserType = data?.userType || "guest";
          setUserType(currentUserType);

          // Show captcha for guests always, or for permanent users on first login
          if (currentUserType === "guest" || !firstLoginCompleted) {
            setShowCaptcha(true);
          } else {
            setShowCaptcha(false);
          }
        }
      }
    };

    checkLoginStatus();
  }, []);

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

        {/* hCaptcha - Show conditionally based on user type and login history */}
        {showCaptcha && (
          <div className="flex justify-center mb-6">
            <HCaptcha
              sitekey="9ba0caa8-6558-48f2-a5ae-5e525cf200fe"
              onVerify={(token) => setCaptchaToken(token)}
            />
          </div>
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
              captchaToken={captchaToken}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login page...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
