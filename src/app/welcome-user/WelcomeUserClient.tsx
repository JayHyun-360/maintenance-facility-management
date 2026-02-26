"use client";

import { useRouter } from "next/navigation";

interface WelcomeUserClientProps {
  userName: string;
  userRole: string;
  userId: string;
}

export default function WelcomeUserClient({
  userName,
  userRole,
  userId,
}: WelcomeUserClientProps) {
  const router = useRouter();

  const handleGetStarted = () => {
    console.log("=== GET STARTED CLICKED ===");
    console.log("User role:", userRole);
    console.log("User ID:", userId);

    // Redirect based on role
    if (userRole === "admin") {
      console.log("Redirecting admin to admin dashboard");
      router.push("/admin/dashboard");
    } else {
      console.log("Redirecting user to user dashboard");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-header text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-gray-600">
            Your account has been successfully created and you're ready to start
            using the Maintenance Portal.
          </p>
        </div>

        <button
          onClick={handleGetStarted}
          className="w-full bg-green-500 text-white rounded-lg py-3 px-6 font-medium hover:bg-green-600 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
