"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface AuthCallbackPageProps {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
    next?: string;
  }>;
}

interface AuthCallbackContentProps {
  searchParams: {
    code?: string;
    error?: string;
    error_description?: string;
    next?: string;
  };
}

function AuthCallbackContent({ searchParams }: AuthCallbackContentProps) {
  const router = useRouter();
  const searchParamsClient = useSearchParams();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  );

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParamsClient.get("code");
      const error = searchParamsClient.get("error");
      const errorDescription = searchParamsClient.get("error_description");

      if (error) {
        return;
      }

      if (code) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          router.push(
            `/auth/error?message=${encodeURIComponent(`Session check failed: ${sessionError.message}`)}`,
          );
          return;
        }

        if (sessionData?.session) {
          const userRole = sessionData.session.user.app_metadata?.role;
          const isAdmin = userRole === "admin";
          const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";

          router.push(redirectUrl);
          return;
        }

        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          const errorDetails = {
            message: exchangeError.message || "Unknown error",
            status: exchangeError.status,
            code: (exchangeError as any).code || "unknown_code",
          };

          const errorParams = new URLSearchParams({
            error: errorDetails.code,
            error_description: `${errorDetails.message} (Status: ${errorDetails.status})`,
          });

          router.push(`/auth/error?${errorParams.toString()}`);
          return;
        }

        if (data.session) {
          await new Promise((resolve) => setTimeout(resolve, 500));

          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError) {
            router.push(
              `/auth/error?message=${encodeURIComponent(`Failed to get user: ${userError.message}`)}`,
            );
            return;
          }

          if (userData.user) {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id, user_id, database_role, full_name, created_at")
              .eq("user_id", userData.user.id)
              .maybeSingle();

            if (profileError) {
              router.push(
                `/auth/error?message=${encodeURIComponent(`Profile creation failed: ${profileError.message}`)}`,
              );
              return;
            }

            if (profile) {
              const userRole =
                userData.user.app_metadata?.role || profile.database_role;
              const isAdmin = userRole === "admin";
              const redirectUrl = isAdmin ? "/admin/dashboard" : "/dashboard";
              router.push(redirectUrl);
            } else {
              const email = userData.user.email || "";
              const name =
                userData.user.user_metadata?.full_name || email.split("@")[0];

              const profileCreationUrl = `/profile-creation?role=user&name=${encodeURIComponent(name)}`;
              router.push(profileCreationUrl);
            }
          }
        }
      } else {
        const { data: sessionData, error } = await supabase.auth.getSession();

        if (error) {
          const errorMessage =
            typeof error === "string"
              ? error
              : (error as any)?.message || "Unknown error";
          router.push(
            `/auth/error?message=${encodeURIComponent(errorMessage)}`,
          );
          return;
        }

        if (sessionData?.session) {
          router.push("/dashboard");
        } else {
          router.push("/auth/error?message=No authentication parameters found");
        }
      }
    };

    handleAuthCallback();
  }, [router, searchParamsClient, supabase]);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h1 className="font-header text-xl font-bold text-gray-900 mb-2">
          Completing sign in...
        </h1>
        <p className="text-gray-600">
          Please wait while we set up your session.
        </p>
      </div>
    </div>
  );
}

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h1 className="font-header text-xl font-bold text-gray-900 mb-2">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <AuthCallbackContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
