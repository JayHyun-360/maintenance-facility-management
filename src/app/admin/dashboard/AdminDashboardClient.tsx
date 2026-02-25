"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  MaintenanceRequest,
  RequestStatus,
  ThemePreference,
} from "@/types/database";

interface RequestWithProfile extends MaintenanceRequest {
  profiles: Profile | null;
  requester_name?: string;
}

interface AdminDashboardClientProps {
  initialRequests: RequestWithProfile[];
  initialStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  initialProfile: Profile | null;
  userAvatar?: string | null;
  userId: string;
}

export default function AdminDashboardClient({
  initialRequests,
  initialStats,
  initialProfile,
  userAvatar,
  userId,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [requests, setRequests] =
    useState<RequestWithProfile[]>(initialRequests);
  const [stats, setStats] = useState(initialStats);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingRequest, setEditingRequest] =
    useState<RequestWithProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editFormData, setEditFormData] = useState({
    nature: "",
    urgency: "",
    location: "",
    description: "",
    status: "Pending",
  });
  const profileViewerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const supabase = createClient()!;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileViewerRef.current &&
        !profileViewerRef.current.contains(event.target as Node)
      ) {
        setShowProfileViewer(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Poll for request updates
  useEffect(() => {
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await (supabase.from("notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("id", notificationId);
    fetchNotifications();
  };

  const markAllNotificationsRead = async () => {
    await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("is_read", false);
    fetchNotifications();
  };

  // Fetch notifications on mount and poll
  useEffect(() => {
    fetchNotifications();
    const notificationInterval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(notificationInterval);
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
          educational_level,
          database_role
        )
      `,
      )
      .order("created_at", { ascending: false });

    const requestsData = (data as RequestWithProfile[]) || [];
    setRequests(requestsData);

    setStats({
      total: requestsData.length,
      pending: requestsData.filter((r) => r.status === "Pending").length,
      inProgress: requestsData.filter((r) => r.status === "In Progress").length,
      completed: requestsData.filter((r) => r.status === "Completed").length,
    });
  };

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: RequestStatus,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await (
      supabase.from("maintenance_requests") as any
    )
      .update({ status: newStatus })
      .eq("id", requestId);

    if (updateError) {
      alert("Error updating request status");
      return;
    }

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

    fetchRequests();
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this request? This action cannot be undone.",
      )
    ) {
      return;
    }

    const { error: deleteError } = await (
      supabase.from("maintenance_requests") as any
    )
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      alert("Error deleting request");
      return;
    }

    fetchRequests();
  };

  const handleStatusChange = (request: RequestWithProfile) => {
    setEditingRequest(request);
    setEditFormData({
      ...editFormData,
      status: request.status,
    });
  };

  const handleSaveStatus = async () => {
    if (!editingRequest) return;

    const { error: updateError } = await (
      supabase.from("maintenance_requests") as any
    )
      .update({
        status: editFormData.status,
      })
      .eq("id", editingRequest.id);

    if (updateError) {
      alert("Error updating status");
      return;
    }

    setEditingRequest(null);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      {/* Enhanced Header */}
      <div className="bg-[#84B179] shadow-lg border-b transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              {/* Profile Avatar */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileViewer(!showProfileViewer)}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 transition-all duration-300 hover:scale-110 hover:bg-white/30 overflow-hidden"
                  title="Click to view profile picture"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-white font-bold text-lg ${userAvatar ? "hidden" : ""}`}
                  >
                    {profile?.full_name?.charAt(0).toUpperCase() || "A"}
                  </span>
                </button>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>

                {/* Profile Picture Viewer */}
                {showProfileViewer && userAvatar && (
                  <div
                    className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ${showProfileViewer ? "opacity-100" : "opacity-0"}`}
                  >
                    <div
                      className={`relative transform transition-all duration-300 ${showProfileViewer ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
                      ref={profileViewerRef}
                    >
                      <div className="w-72 h-72 rounded-full bg-white/20 backdrop-blur-xl shadow-2xl border-2 border-white/30 flex flex-col items-center justify-center p-8">
                        <div className="w-56 h-56 rounded-full overflow-hidden border-3 border-white/50 shadow-lg mb-4 bg-white">
                          <img
                            src={userAvatar}
                            alt="Profile Picture"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <h3 className="font-semibold text-white text-lg text-center">
                          {profile?.full_name}
                        </h3>
                        <p className="text-sm text-white/80 text-center">
                          {profile?.visual_role} - Administrator
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Welcome Text */}
              <div className="text-white">
                <h1 className="text-2xl font-bold transition-all duration-300 hover:scale-105">
                  Welcome back, {profile?.full_name}!
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-white transition-all duration-300 hover:bg-white/30">
                    Administrator
                  </span>
                  <span className="text-white/80 text-sm">•</span>
                  <span className="text-white/80 text-sm font-medium">
                    Admin Dashboard
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleThemeToggle}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 transform hover:scale-105 text-white"
                title={`Current theme: ${profile?.theme_preference}`}
              >
                {profile?.theme_preference === "dark" ? (
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
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                ) : profile?.theme_preference === "light" ? (
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
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
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
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>

              {/* Notifications Bell */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 transform hover:scale-105 text-white relative"
                title="Notifications"
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowProfileSidebar(true)}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:bg-white/30 hover:scale-105 text-sm"
              >
                Settings
              </button>

              <button
                onClick={handleSignOut}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:bg-white/30 hover:scale-105 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#84B179]/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#84B179]"
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

          <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
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

          <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
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

          <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn">
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

        {/* Analytics - Nature of Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 transition-all duration-300 hover:shadow-md animate-fadeIn">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Requests by Nature
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Plumbing", color: "bg-blue-500", icon: "🔧" },
              { name: "Electrical", color: "bg-yellow-500", icon: "⚡" },
              { name: "Carpentry", color: "bg-amber-700", icon: "🪵" },
              { name: "HVAC", color: "bg-cyan-500", icon: "❄️" },
              { name: "Cleaning", color: "bg-purple-500", icon: "🧹" },
              { name: "Other", color: "bg-gray-500", icon: "📋" },
            ].map((nature) => {
              const count = requests.filter(
                (r) => r.nature === nature.name,
              ).length;
              const percentage =
                stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div
                  key={nature.name}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{nature.icon}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {nature.name}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {count}
                    </span>
                    <span className="text-sm text-gray-500 mb-1">
                      ({percentage}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${nature.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Master Queue Table */}
        <div className="bg-white rounded-xl shadow-sm transition-all duration-300 hover:shadow-md animate-fadeIn">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Requester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 transition-all duration-300"
                  >
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
                        {request.photos && request.photos.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {request.photos.slice(0, 3).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Attachment ${index + 1}`}
                                className="w-10 h-10 object-cover rounded border border-gray-200"
                              />
                            ))}
                            {request.photos.length > 3 && (
                              <span className="text-xs text-gray-500 self-center">
                                +{request.photos.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
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
                            className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
                          >
                            Start
                          </button>
                        )}
                        {request.status === "In Progress" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(request.id, "Completed")
                            }
                            className="text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-md"
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
                            className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(request)}
                          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 ml-2"
                          title="Change Status"
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(request.id)}
                          className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 ml-2"
                          title="Delete request"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {requests.length === 0 && (
              <div className="text-center py-12 text-gray-500 animate-fadeIn">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
                <p className="text-lg">No maintenance requests found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Requests will appear here when users submit them
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#84B179] p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Change Status</h2>
                <button
                  onClick={() => setEditingRequest(null)}
                  className="text-white/80 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Sidebar */}
      <div
        ref={notificationsRef}
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-500 ease-out ${
          showNotifications ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div className="bg-[#84B179] shadow-lg border-b transition-all duration-300 p-6 sticky top-0 z-10">
            <div className="flex justify-center items-center">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
          </div>
          <div className="p-4">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="w-full mb-4 text-sm text-green-600 hover:text-green-700 text-center"
              >
                Mark all as read
              </button>
            )}
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      !notification.is_read
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                          !notification.is_read ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Settings Sidebar */}
      <>
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-500 ${showProfileSidebar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => setShowProfileSidebar(false)}
        />
        <div
          className={`fixed top-0 left-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-500 ease-out ${showProfileSidebar ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="h-full overflow-y-auto">
            <div className="bg-[#84B179] shadow-lg border-b transition-all duration-300 p-6 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  Profile Settings
                </h2>
                <button
                  onClick={() => setShowProfileSidebar(false)}
                  className="text-white/80 hover:text-white transition-all duration-300 hover:scale-110"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Full Name
                    </label>
                    <p className="text-gray-900 font-medium">
                      {profile?.full_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Visual Role
                    </label>
                    <p className="text-gray-900 font-medium">
                      {profile?.visual_role || "Not Set"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Access Mode
                    </label>
                    <span className="px-3 py-1 bg-[#84B179] text-white text-sm font-medium rounded-full">
                      Administrator
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Theme Preference
                    </label>
                    <p className="text-gray-900 font-medium capitalize">
                      {profile?.theme_preference}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>
                      Account created:{" "}
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Access Mode Management */}
              <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ⚙️ Access Mode Management
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  As an administrator, you can switch between admin and user
                  modes to test different user experiences.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Switching modes will update your
                    profile and maintain your user data. You can switch back at
                    any time.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/profile-settings")}
                  className="w-full px-4 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all duration-300"
                >
                  Switch to User Mode
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  When in user mode, you can experience the interface as regular
                  users do
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-300 transform hover:scale-[1.02] text-red-600"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
