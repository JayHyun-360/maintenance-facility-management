"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>(
    "Unknown authentication error",
  );

  useEffect(() => {
    // Get error message from URL parameters
    const message = searchParams.get("message");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (message) {
      setErrorMessage(decodeURIComponent(message));
    } else if (error) {
      setErrorMessage(
        `OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`,
      );
    }

    // Auto-redirect to login after 10 seconds (increased for debugging)
    const timer = setTimeout(() => {
      window.location.href = "/login";
    }, 10000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-mono text-red-800 break-words">
            {errorMessage}
          </p>
        </div>
        <p className="text-gray-600 mb-6">
          There was an error signing you in. You will be redirected to the login
          page automatically.
        </p>

        <Link
          href="/login"
          className="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Return to Login
        </Link>

        <p className="text-sm text-gray-500 mt-4">
          Redirecting in 10 seconds...
        </p>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
