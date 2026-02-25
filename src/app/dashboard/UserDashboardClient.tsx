"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  MaintenanceRequest,
  RequestStatus,
  ThemePreference,
} from "@/types/database";

interface UserDashboardClientProps {
  initialProfile: Profile | null;
  initialRequests: MaintenanceRequest[];
  userId: string;
}

export default function UserDashboardClient({
  initialProfile,
  initialRequests,
  userId,
}: UserDashboardClientProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [requests, setRequests] =
    useState<MaintenanceRequest[]>(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nature: "",
    urgency: "",
    location: "",
    description: "",
    supportingReason: "",
  });

  const supabase = createClient()!;

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("maintenance_requests")
      .select("*")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    setRequests(data || []);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await (
      supabase.from("maintenance_requests") as any
    ).insert({
      requester_id: userId,
      nature: formData.nature,
      urgency: formData.urgency,
      location: formData.location,
      description: formData.description,
    });

    if (error) {
      alert("Error submitting request");
      return;
    }

    // Reset form and refresh requests
    setFormData({
      nature: "",
      urgency: "",
      location: "",
      description: "",
      supportingReason: "",
    });
    setShowForm(false);
    fetchRequests();
  };

  const handleThemeToggle = async () => {
    if (!profile) return;

    const newTheme: ThemePreference =
      profile.theme_preference === "light"
        ? "dark"
        : profile.theme_preference === "dark"
          ? "system"
          : "light";

    const { error } = await (supabase.from("profiles") as any)
      .update({ theme_preference: newTheme })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, theme_preference: newTheme });
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 transition-all duration-300">
                Welcome, {profile?.full_name}
              </h1>
              <p className="text-sm text-gray-600 transition-all duration-300">
                {profile?.visual_role} •{" "}
                {profile?.database_role === "admin" ? "Administrator" : "User"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleThemeToggle}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                title={`Current theme: ${profile?.theme_preference}`}
              >
                {profile?.theme_preference === "dark" ? (
                  <svg
                    className="w-5 h-5 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                ) : profile?.theme_preference === "light" ? (
                  <svg
                    className="w-5 h-5 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>

              <a
                href="/profile-settings"
                className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
              >
                Settings
              </a>

              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-300">
          {/* New Request Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 transition-all duration-300">
                  New Request
                </h2>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
                  >
                    Create
                  </button>
                )}
              </div>

              {showForm ? (
                <form
                  onSubmit={handleSubmitRequest}
                  className="space-y-4 animate-fadeIn"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-300">
                      Nature *
                    </label>
                    <select
                      value={formData.nature}
                      onChange={(e) =>
                        setFormData({ ...formData, nature: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 focus:scale-[1.02]"
                      required
                    >
                      <option value="">Select nature</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Carpentry">Carpentry</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-300">
                      Urgency *
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) =>
                        setFormData({ ...formData, urgency: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 focus:scale-[1.02]"
                      required
                    >
                      <option value="">Select urgency</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Not Urgent">Not Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-300">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 focus:scale-[1.02]"
                      placeholder="Building, room, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-300">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 focus:scale-[1.02]"
                      rows={3}
                      placeholder="Describe issue..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 transition-all duration-300">
                      Supporting Reason
                    </label>
                    <textarea
                      value={formData.supportingReason}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supportingReason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 focus:scale-[1.02]"
                      rows={2}
                      placeholder="Additional context..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-500 animate-fadeIn">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300 transition-all duration-300 hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="transition-all duration-300">
                    Click &quot;Create&quot; to submit a new maintenance request
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Requests List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 transition-all duration-300">
                Your Requests
              </h2>

              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500 animate-fadeIn">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300 transition-all duration-300 hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="transition-all duration-300">
                    No maintenance requests yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.01] hover:border-gray-300 animate-fadeIn"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 transition-all duration-300">
                            {request.nature}
                          </h3>
                          <p className="text-sm text-gray-600 transition-all duration-300">
                            {request.location}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-300 ${getStatusColor(request.status)}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2 transition-all duration-300">
                        {request.description}
                      </p>

                      <div className="flex justify-between items-center text-xs text-gray-500 transition-all duration-300">
                        <span>Urgency: {request.urgency}</span>
                        <span>
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
