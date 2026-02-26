"use client";

import { useRouter } from "next/navigation";

interface WelcomeAdminClientProps {
  userName: string;
  userRole: string;
  userId: string;
}

export default function WelcomeAdminClient({
  userName,
  userRole,
  userId,
}: WelcomeAdminClientProps) {
  const router = useRouter();

  const handleGoManage = () => {
    console.log("=== GO MANAGE NOW CLICKED ===");
    console.log("Admin user role:", userRole);
    console.log("Admin user ID:", userId);

    // Redirect to admin dashboard
    console.log("Redirecting to admin dashboard");
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="font-header text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-gray-600">
            Your admin account has been successfully created. You're ready to
            manage the Maintenance Facility system.
          </p>
        </div>

        <button
          onClick={handleGoManage}
          className="w-full bg-blue-500 text-white rounded-lg py-3 px-6 font-medium hover:bg-blue-600 transition-colors"
        >
          Go Manage Now
        </button>
      </div>
    </div>
  );
}
