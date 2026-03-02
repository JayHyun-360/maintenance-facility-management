"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "./actions";
import type { VisualRole } from "@/types/database";

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
  const [activeTab, setActiveTab] = useState<"email" | "google" | "guest">(
    "email",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  // Handle tab switching with smooth transition
  const handleTabSwitch = (tab: "email" | "google" | "guest") => {
    if (isTransitioning || tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 150);
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const supabase = createClient()!;

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // User is already authenticated, redirect to appropriate dashboard
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

  // Load hCaptcha script
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

  // Reset captcha
  const resetCaptcha = () => {
    if (window.hcaptcha) {
      window.hcaptcha.reset();
    }
    setEmailData((prev) => ({ ...prev, captchaToken: "" }));
  };

  // Validate email form
  const validateEmailForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!emailData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!emailData.captchaToken) {
      newErrors.captcha = "Please complete captcha verification";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email sign in (Magic Link - passwordless)
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
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Handle email sign up (Magic Link - passwordless)
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
      // Use signInWithOtp for magic link - works for both new and existing users
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
      setShowSignUp(false);
    } catch (error) {
      console.error("Unexpected sign up error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Use server action to initiate OAuth (stores PKCE verifier in cookies)
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

  // Handle guest sign in
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

    if (!guestData.captchaToken) {
      alert("Please complete the captcha verification");
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { error, data } = await supabase.auth.signInAnonymously({
        options: {
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

      // Check if guest user has profile before redirecting
      try {
        if (!data?.user?.id) {
          router.push("/dashboard"); // Fallback
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
          // New guest user - redirect to profile creation
          const name = guestData.fullName;
          router.push(
            `/profile-creation?role=user&name=${encodeURIComponent(name)}`,
          );
        }
      } catch (error) {
        router.push("/dashboard"); // Fallback
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

  // Handle authentication errors
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

  // hCaptcha callbacks
  useEffect(() => {
    window.onHCaptchaLoad = () => {
      console.log("hCaptcha loaded");
    };

    window.onHCaptchaVerify = (token: string) => {
      setEmailData((prev) => ({ ...prev, captchaToken: token }));
      setErrors((prev) => ({ ...prev, captcha: "" }));
    };

    window.onHCaptchaError = (error: any) => {
      console.error("hCaptcha error:", error);
      setErrors({ captcha: "Captcha verification failed. Please try again." });
    };

    window.onHCaptchaExpire = () => {
      setEmailData((prev) => ({ ...prev, captchaToken: "" }));
      setErrors({ captcha: "Captcha expired. Please verify again." });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Maintenance Portal
        </h1>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b relative">
          <div
            className="absolute bottom-0 h-0.5 bg-green-500 transition-all duration-300 ease-out"
            style={{
              width: "33.333%",
              transform: `translateX(${activeTab === "email" ? 0 : activeTab === "google" ? 100 : 200}%)`,
            }}
          />
          <button
            onClick={() => handleTabSwitch("email")}
            className={`flex-1 pb-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "email"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => handleTabSwitch("google")}
            className={`flex-1 pb-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "google"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Google
          </button>
          <button
            onClick={() => handleTabSwitch("guest")}
            className={`flex-1 pb-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "guest"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Guest
          </button>
        </div>

        {/* Tab Content with Smooth Transitions */}
        <div className="relative min-h-[400px]">
          <div
            className={`transition-all duration-300 ease-in-out ${
              isTransitioning
                ? "opacity-0 transform scale-95"
                : "opacity-100 transform scale-100"
            }`}
          >
            {/* Email Form */}
            {activeTab === "email" && !showSignUp && (
              <div className="space-y-4 animate-fadeIn">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* hCaptcha */}
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
                    {loading ? "Sending..." : "Send Magic Link"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowSignUp(true)}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Don&apos;t have an account? Sign up
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sign Up Form - Using Magic Link (passwordless) */}
            {activeTab === "email" && showSignUp && (
              <div className="space-y-4 animate-fadeIn">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
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
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* hCaptcha */}
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

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSignUp(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-green-500 text-white rounded-lg py-3 px-4 font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Send Magic Link"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Google Sign In */}
            {activeTab === "google" && (
              <div className="space-y-4 animate-fadeIn">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                  <span>
                    {loading ? "Signing in..." : "Continue with Google"}
                  </span>
                </button>
              </div>
            )}

            {/* Guest Sign In */}
            {activeTab === "guest" && (
              <div className="space-y-4 animate-fadeIn">
                <button
                  onClick={() => setShowGuestModal(true)}
                  disabled={loading}
                  className="w-full bg-gray-100 text-gray-700 rounded-lg py-3 px-4 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Continue as Guest
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Guest Modal */}
        {showGuestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Guest Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={guestData.fullName}
                    onChange={(e) =>
                      setGuestData({ ...guestData, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visual Role
                  </label>
                  <select
                    value={guestData.visualRole}
                    onChange={(e) =>
                      setGuestData({
                        ...guestData,
                        visualRole: e.target.value as VisualRole,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Staff">Staff</option>
                    <option value="Student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Educational Level
                  </label>
                  <select
                    value={guestData.educationalLevel}
                    onChange={(e) =>
                      setGuestData({
                        ...guestData,
                        educationalLevel: e.target.value,
                        department: "",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Level</option>
                    <option value="Elementary">Elementary</option>
                    <option value="High School">High School</option>
                    <option value="College">College</option>
                  </select>
                </div>

                {guestData.educationalLevel === "College" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <input
                      type="text"
                      value={guestData.department}
                      onChange={(e) =>
                        setGuestData({
                          ...guestData,
                          department: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter your department"
                    />
                  </div>
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
                  onClick={handleGuestSignIn}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
