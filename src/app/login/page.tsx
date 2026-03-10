"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "./actions";
import type { VisualRole } from "@/types/database";
import DoodleBackground from "./DoodleBackground";

interface EmailFormData {
  email: string;
  password: string;
  rememberMe: boolean;
  captchaToken: string;
}

interface GuestFormData {
  fullName: string;
  visualRole: VisualRole;
  educationalLevel: string;
  department: string;
  captchaToken: string;
}

declare global {
  interface Window {
    hcaptcha: any;
    onHCaptchaLoad?: () => void;
    onHCaptchaVerify?: (token: string) => void;
    onHCaptchaError?: (error: any) => void;
    onHCaptchaExpire?: () => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const [emailData, setEmailData] = useState<EmailFormData>({
    email: "",
    password: "",
    rememberMe: false,
    captchaToken: "",
  });

  const [guestData, setGuestData] = useState<GuestFormData>({
    fullName: "",
    visualRole: "Student",
    educationalLevel: "",
    department: "",
    captchaToken: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const supabase = createClient()!;

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const userRole = session.user.app_metadata?.role || "user";
          const redirectUrl =
            userRole === "admin" ? "/admin/dashboard" : "/dashboard";
          router.replace(redirectUrl);
        }
      } catch (error) {
        console.error("Error checking existing auth:", error);
      }
    };

    checkExistingAuth();
  }, [router, supabase]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const resetCaptcha = () => {
    if (window.hcaptcha) {
      window.hcaptcha.reset();
    }
    setEmailData((prev) => ({ ...prev, captchaToken: "" }));
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.email)) {
      setErrors({ email: "Invalid email format" });
      return;
    }

    if (!emailData.captchaToken) {
      setErrors({ captcha: "Please complete captcha verification" });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailData.email,
        options: {
          captchaToken: emailData.captchaToken,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        handleAuthError(error);
        resetCaptcha();
        return;
      }

      setSuccessMessage("Check your email for the magic link!");
      setShowEmailForm(false);
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.email)) {
      setErrors({ email: "Invalid email format" });
      return;
    }

    if (!emailData.captchaToken) {
      setErrors({ captcha: "Please complete captcha verification" });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailData.email,
        options: {
          captchaToken: emailData.captchaToken,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: emailData.email.split("@")[0],
          },
        },
      });

      if (error) {
        handleAuthError(error);
        resetCaptcha();
        return;
      }

      setSuccessMessage(
        "Check your email for the magic link to complete sign up!",
      );
      setShowEmailForm(false);
      setShowSignUp(false);
    } catch (error) {
      console.error("Unexpected sign up error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during sign-in. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAgreementAccept = async () => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInAnonymously({
        options: {
          captchaToken: guestData.captchaToken || undefined,
          data: {
            full_name: "Guest",
            database_role: "user",
            visual_role: "Student",
            educational_level: null,
            department: null,
            is_anonymous: true,
          },
        },
      });

      if (error) {
        handleAuthError(error);
        return;
      }

      router.push("/profile-creation?role=user&name=Guest");
    } catch (error) {
      console.error("Unexpected guest sign in error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (!guestData.fullName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (
      guestData.educationalLevel === "College" &&
      !guestData.department.trim()
    ) {
      alert("Department is required for College level");
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { error, data } = await supabase.auth.signInAnonymously({
        options: {
          captchaToken: guestData.captchaToken || undefined,
          data: {
            full_name: guestData.fullName,
            database_role: "user",
            visual_role: guestData.visualRole,
            educational_level: guestData.educationalLevel || null,
            department: guestData.department || null,
            is_anonymous: true,
          },
        },
      });

      if (error) {
        handleAuthError(error);
        return;
      }

      try {
        if (!data?.user?.id) {
          router.push("/dashboard");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile) {
          router.push("/dashboard");
        } else {
          const name = guestData.fullName;
          router.push(
            `/profile-creation?role=user&name=${encodeURIComponent(name)}`,
          );
        }
      } catch (error) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Unexpected guest sign in error:", error);
      setErrors({
        general:
          "An unexpected error occurred during guest sign-in. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error("Auth error:", error);

    switch (error.message) {
      case "Invalid login credentials":
        setErrors({ general: "Invalid email or password. Please try again." });
        break;
      case "Email not confirmed":
        setErrors({
          general:
            "Please check your email and confirm your account before signing in.",
        });
        break;
      case "User already registered":
        setErrors({
          general:
            "An account with this email already exists. Please sign in instead.",
        });
        break;
      case "captcha_verification_failed":
        setErrors({
          captcha: "Captcha verification failed. Please try again.",
        });
        break;
      case "rate_limit_exceeded":
        setErrors({
          general: "Too many attempts. Please wait a moment and try again.",
        });
        break;
      case "signup_disabled":
        setErrors({
          general:
            "Email sign up is currently disabled. Please use Google sign in or guest access.",
        });
        break;
      case "password_reset_disabled":
        setErrors({
          general:
            "Password reset is currently disabled. Please contact support.",
        });
        break;
      default:
        if (error.message.includes("provider is not enabled")) {
          setErrors({
            general:
              "This sign-in method is not configured. For local development, please:\n\n1. Ensure Google OAuth is configured in your Supabase project\n2. Or use the production environment at https://maintenance-facility-management.vercel.app\n\nContact administrator if the issue persists.",
          });
        } else if (error.message.includes("access_denied")) {
          setErrors({
            general:
              "Access denied. Please try again or use a different sign-in method.",
          });
        } else {
          setErrors({ general: `Authentication error: ${error.message}` });
        }
    }
  };

  useEffect(() => {
    window.onHCaptchaLoad = () => {
      console.log("hCaptcha loaded");
    };

    window.onHCaptchaVerify = (token: string) => {
      setEmailData((prev) => ({ ...prev, captchaToken: token }));
      setGuestData((prev) => ({ ...prev, captchaToken: token }));
      setErrors((prev) => ({ ...prev, captcha: "" }));
    };

    window.onHCaptchaError = (error: any) => {
      console.error("hCaptcha error:", error);
      setErrors({ captcha: "Captcha verification failed. Please try again." });
    };

    window.onHCaptchaExpire = () => {
      setEmailData((prev) => ({ ...prev, captchaToken: "" }));
      setGuestData((prev) => ({ ...prev, captchaToken: "" }));
      setErrors({ captcha: "Captcha expired. Please verify again." });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <DoodleBackground />
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md min-h-[600px]">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
          IVF Maintenance Utility
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Integrated Visual Feedback & Maintenance Portal
        </p>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
            {errors.general}
          </div>
        )}

        {!showEmailForm ? (
          <div className="space-y-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGoogleSignIn();
              }}
              disabled={loading}
              className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmailForm(true);
              }}
              disabled={loading}
              className="w-full bg-green-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">Continue with Email</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGuestModal(true);
              }}
              disabled={loading}
              className="w-full bg-gray-100 text-gray-700 rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="font-medium">Continue as Guest</span>
            </button>

            {/* hCaptcha for Email and Guest options */}
            <div className="mt-6">
              <div
                className="h-captcha"
                data-sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                data-callback="onHCaptchaVerify"
                data-error-callback="onHCaptchaError"
                data-expired-callback="onHCaptchaExpire"
              ></div>
              {errors.captcha && (
                <p className="mt-1 text-sm text-red-600 text-center">
                  {errors.captcha}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setShowEmailForm(false);
                setErrors({});
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to options
            </button>

            <form onSubmit={showSignUp ? handleEmailSignUp : handleEmailSignIn}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailData.email}
                    onChange={(e) =>
                      setEmailData({ ...emailData, email: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div
                    className="h-captcha"
                    data-sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                    data-callback="onHCaptchaVerify"
                    data-error-callback="onHCaptchaError"
                    data-expired-callback="onHCaptchaExpire"
                  ></div>
                  {errors.captcha && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.captcha}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 text-white rounded-lg py-3 px-4 font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Sending..."
                    : showSignUp
                      ? "Send Magic Link"
                      : "Send Magic Link"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowSignUp(!showSignUp)}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    {showSignUp
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {showGuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Guest Access Agreement
            </h2>

            <div className="space-y-4 text-sm text-gray-600">
              <p>By continuing as a guest, you agree to the following terms:</p>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="font-medium text-gray-700">
                    • Limited Access:
                  </span>{" "}
                  Guest accounts have basic access to submit maintenance
                  requests only.
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    • No Account:
                  </span>{" "}
                  Your session is temporary and not linked to a permanent
                  account.
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    • Data Retention:
                  </span>{" "}
                  Your profile and request history will be stored in our system.
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    • Proper Use:
                  </span>{" "}
                  You must use this system for legitimate maintenance requests
                  only.
                </div>
                <div>
                  <span className="font-medium text-gray-700">• No Spam:</span>{" "}
                  Abuse of this system may result in session termination.
                </div>
              </div>

              <p className="text-xs text-gray-500">
                For full features and permanent account, consider signing up
                with Google or email.
              </p>
            </div>

            <div className="mt-4">
              <div
                className="h-captcha"
                data-sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                data-callback="onHCaptchaVerify"
                data-error-callback="onHCaptchaError"
                data-expired-callback="onHCaptchaExpire"
              ></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGuestModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleGuestAgreementAccept}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "I Agree & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
