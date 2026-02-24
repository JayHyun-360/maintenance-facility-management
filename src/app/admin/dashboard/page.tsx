"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  MaintenanceRequest,
  MaintenanceRequestUpdate,
  RequestStatus,
  AuditLog,
} from "@/types/database";

interface RequestWithProfile extends MaintenanceRequest {
  profiles: Profile | null;
  requester_name?: string;
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const setProfile = (profile: any) => {
    if (profile) {
      // Update local state for UI
      // Note: In a real app, this would update the database
    }
  };

  const supabase = createClient()!;

  useEffect(() => {
    // Check authentication first with retry logic
    const checkAuth = async () => {
      let session = null;

      // Try up to 2 times to get session
      for (let i = 0; i < 2; i++) {
        const result = await supabase.auth.getSession();

        if (
          result.data?.session?.access_token &&
          result.data?.session?.user?.id
        ) {
          session = result.data.session;
          break;
        }

        // Wait briefly before retry
        if (i === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!session) {
        console.log(
          "No valid session found in admin dashboard - redirecting to login",
        );
        window.location.href = "/login";
        return;
      }

      // Check for test session
      const testSession = sessionStorage.getItem("testSession");

      if (testSession) {
        try {
          const sessionData = JSON.parse(testSession);
          setProfile(sessionData);

          // Fetch mock requests for test session
          setRequests([
            {
              id: "test-admin-req-1",
              requester_id: "test-session",
              requester_name: sessionData.full_name,
              nature: "Plumbing",
              urgency: "Urgent",
              location: "Server Room",
              description: "Test admin request - server maintenance",
              status: "Pending",
              created_at: new Date(Date.now() - 86400000).toISOString(),
              profiles: {
                id: "test-session",
                full_name: sessionData.full_name,
                database_role: sessionData.database_role,
                visual_role: sessionData.visual_role,
                educational_level: null,
                department: null,
                is_anonymous: sessionData.is_anonymous,
                theme_preference: "system",
                created_at: new Date().toISOString(),
              },
            },
            {
              id: "test-admin-req-2",
              requester_id: "test-session",
              requester_name: sessionData.full_name,
              nature: "Electrical",
              urgency: "Not Urgent",
              location: "Office Area",
              description: "Test admin request - lighting issues",
              status: "In Progress",
              created_at: new Date(Date.now() - 172800000).toISOString(),
              profiles: {
                id: "test-session",
                full_name: sessionData.full_name,
                database_role: sessionData.database_role,
                visual_role: sessionData.visual_role,
                educational_level: null,
                department: null,
                is_anonymous: sessionData.is_anonymous,
                theme_preference: "system",
                created_at: new Date().toISOString(),
              },
            },
          ]);

          setLoading(false);
          return;
        } catch (error) {
          console.error("Failed to parse test session:", error);
        }
      }

      // Original auth flow for real users
      fetchRequests();
    };

    checkAuth();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("maintenance_requests")
      .select(
        `
        *,
        profiles (
          id,
          full_name,
          visual_role,
          educational_level
        )
      `,
      )
      .order("created_at", { ascending: false });

    const requests = (data as RequestWithProfile[]) || [];
    setRequests(requests);

    // Calculate stats
    setStats({
      total: requests.length,
      pending: requests.filter((r) => r.status === "Pending").length,
      inProgress: requests.filter((r) => r.status === "In Progress").length,
      completed: requests.filter((r) => r.status === "Completed").length,
    });

    setLoading(false);
  };

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: RequestStatus,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Update the request status
    const { error: updateError } = await (
      supabase.from("maintenance_requests") as any
    )
      .update({ status: newStatus })
      .eq("id", requestId);

    if (updateError) {
      alert("Error updating request status");
      return;
    }

    // Log the change to audit_logs (server action simulation)
    const { error: auditError } = await (
      supabase.from("audit_logs") as any
    ).insert({
      request_id: requestId,
      actor_id: user.id,
      action: `Status changed to ${newStatus}`,
    });

    if (auditError) {
      console.error("Error logging audit:", auditError);
    }

    // Refresh requests
    fetchRequests();
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Emergency":
        return "bg-red-100 text-red-800";
      case "Urgent":
        return "bg-orange-100 text-orange-800";
      case "Not Urgent":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Maintenance Request Management
              </p>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-600"
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
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Master Queue Table */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Master Queue
            </h2>
            <p className="text-sm text-gray-600">All maintenance requests</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.nature}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.location}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.profiles?.full_name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.profiles?.visual_role}
                        </div>
                        {request.profiles?.educational_level && (
                          <div className="text-xs text-gray-400">
                            {request.profiles.educational_level}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate">
                          {request.description}
                        </p>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getUrgencyColor(request.urgency)}`}
                        >
                          {request.urgency}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {request.status === "Pending" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(request.id, "In Progress")
                            }
                            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            Start
                          </button>
                        )}

                        {request.status === "In Progress" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(request.id, "Completed")
                            }
                            className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                          >
                            Complete
                          </button>
                        )}

                        {(request.status === "Pending" ||
                          request.status === "In Progress") && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(request.id, "Cancelled")
                            }
                            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {requests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
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
                <p>No maintenance requests found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
