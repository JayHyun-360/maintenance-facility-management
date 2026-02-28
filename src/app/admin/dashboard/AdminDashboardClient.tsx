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
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "master-queue" | "manage-users"
  >("overview");
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const activeButton = tabRefs.current[activeTab];
    if (activeButton) {
      const tabContainer = activeButton.parentElement;
      if (tabContainer) {
        const indicator = tabContainer.querySelector(
          ".tab-indicator",
        ) as HTMLElement;
        if (indicator) {
          indicator.style.width = `${activeButton.offsetWidth}px`;
          indicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
        }
      }
    }
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] =
    useState<RequestWithProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showReportSidebar, setShowReportSidebar] = useState(false);
  const [selectedRequestForReport, setSelectedRequestForReport] =
    useState<RequestWithProfile | null>(null);
  const [filters, setFilters] = useState({
    status: [] as string[],
    nature: [] as string[],
    urgency: [] as string[],
  });
  const [selectAll, setSelectAll] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userMessages, setUserMessages] = useState<{
    [userId: string]: {
      id: string;
      message: string;
      created_at: string;
      from_admin: boolean;
    }[];
  }>({});
  const [newMessage, setNewMessage] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [showUserInfoPanel, setShowUserInfoPanel] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nature: "",
    urgency: "",
    location: "",
    description: "",
    status: "Pending",
  });
  const profileViewerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);

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
      if (
        aiChatRef.current &&
        !aiChatRef.current.contains(event.target as Node)
      ) {
        setShowAIChat(false);
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
      .eq("id", notificationId)
      .eq("user_id", userId);
    fetchNotifications();
  };

  const markAllNotificationsRead = async () => {
    await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("user_id", userId)
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

  const fetchUsers = async () => {
    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .eq("database_role", "user")
      .order("created_at", { ascending: false });

    if (!usersError && usersData) {
      setUsers(usersData);
    }
  };

  const fetchUserMessages = async (userId: string) => {
    const { data: messagesData } = await (
      supabase.from("admin_messages") as any
    )
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setUserMessages((prev) => ({ ...prev, [userId]: messagesData }));
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    const { data, error } = await (supabase.from("admin_messages") as any)
      .insert({
        user_id: selectedUser.id,
        message: newMessage.trim(),
        from_admin: true,
      })
      .select();

    if (!error && data) {
      setUserMessages((prev) => ({
        ...prev,
        [selectedUser.id]: [...(prev[selectedUser.id] || []), data[0]],
      }));
      setNewMessage("");
    }
  };

  const toggleBlockUser = async (userId: string) => {
    const isBlocked = blockedUsers.includes(userId);
    const newBlocked = isBlocked
      ? blockedUsers.filter((id) => id !== userId)
      : [...blockedUsers, userId];
    setBlockedUsers(newBlocked);

    await (supabase.from("profiles") as any)
      .update({ is_blocked: !isBlocked })
      .eq("id", userId);
  };

  const fetchBlockedUsers = async () => {
    const { data } = await (supabase.from("profiles") as any)
      .select("id")
      .eq("is_blocked", true);
    if (data) {
      setBlockedUsers(data.map((u: any) => u.id));
    }
  };

  const sendBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) return;

    const { data: allUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("database_role", "user");

    if (fetchError || !allUsers || allUsers.length === 0) {
      alert("No users found to send broadcast");
      return;
    }

    const messages = allUsers.map((user: { id: string }) => ({
      user_id: user.id,
      message: broadcastMessage.trim(),
      from_admin: true,
      is_broadcast: true,
    }));

    const { error: insertError } = await (
      supabase.from("admin_messages") as any
    ).insert(messages);

    if (insertError) {
      alert("Error sending broadcast message");
      return;
    }

    setBroadcastMessage("");
    setShowBroadcastModal(false);
    alert(`Broadcast message sent to ${allUsers.length} users!`);

    // Fetch recent broadcasts for display
    fetchBroadcasts();
  };

  const fetchBroadcasts = async () => {
    const { data } = await (supabase.from("admin_messages") as any)
      .select("*")
      .eq("is_broadcast", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setUserMessages((prev) => ({ ...prev, broadcast: data }));
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

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
      <div className="bg-[#427A43] shadow-lg border-b transition-all duration-300">
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
                        <h3 className="font-header font-semibold text-white text-lg text-center">
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
                <h1 className="font-header text-2xl font-bold transition-all duration-300 hover:scale-105">
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

              {/* AI Chat Robot Icon */}
              <button
                onClick={() => setShowAIChat(!showAIChat)}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 transform hover:scale-105 text-white relative"
                title="AI Assistant"
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
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
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

      {/* Tab Navigation */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white border-b">
        <div className="relative flex gap-8 overflow-x-auto">
          {[
            {
              id: "overview",
              label: "Overview",
              icon: (
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              ),
            },
            {
              id: "analytics",
              label: "Analytics",
              icon: (
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              ),
            },
            {
              id: "master-queue",
              label: "Master Queue",
              icon: (
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              ),
            },
            {
              id: "manage-users",
              label: "Manage Users",
              icon: (
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2 pb-3 font-medium transition-all duration-300 whitespace-nowrap z-10 ${
                activeTab === tab.id
                  ? "text-[#427A43]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          {/* Sliding Underline */}
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-[#427A43] transition-all duration-300 ease-out tab-indicator"
            style={{ width: "88px", transform: "translateX(0px)" }}
          />
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300">
        <div className="transition-opacity duration-300 ease-in-out">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <div className="w-12 h-12 bg-[#427A43]/10 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-[#427A43]"
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
                      <p className="text-sm font-medium text-gray-600">
                        Pending
                      </p>
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
                      <p className="text-sm font-medium text-gray-600">
                        In Progress
                      </p>
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
                      <p className="text-sm font-medium text-gray-600">
                        Completed
                      </p>
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

              {/* Recent Requests - Last 1 Hour */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 transition-all duration-300 hover:shadow-md animate-fadeIn">
                <h2 className="font-header text-lg font-semibold text-gray-900 mb-4">
                  Recent Requests (Last 1 Hour)
                </h2>
                {(() => {
                  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                  const recentRequests = requests.filter(
                    (r) => new Date(r.created_at) >= oneHourAgo,
                  );
                  return recentRequests.length > 0 ? (
                    <div className="space-y-3">
                      {recentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {request.nature}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.profiles?.full_name || "Unknown"} •{" "}
                              {request.location}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ml-2 ${request.status === "Pending" ? "bg-yellow-100 text-yellow-700" : request.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                          >
                            {request.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No recent requests in the last hour
                    </p>
                  );
                })()}
              </div>

              {/* Analytics - Nature of Requests */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 transition-all duration-300 hover:shadow-md animate-fadeIn">
                <h2 className="font-header text-lg font-semibold text-gray-900 mb-4">
                  Requests by Nature
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    {
                      name: "Plumbing",
                      color: "bg-blue-500",
                      icon: (
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
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                      ),
                    },
                    {
                      name: "Electrical",
                      color: "bg-yellow-500",
                      icon: (
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      ),
                    },
                    {
                      name: "Carpentry",
                      color: "bg-amber-700",
                      icon: (
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
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                          />
                        </svg>
                      ),
                    },
                    {
                      name: "HVAC",
                      color: "bg-cyan-500",
                      icon: (
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
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      ),
                    },
                    {
                      name: "Cleaning",
                      color: "bg-purple-500",
                      icon: (
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
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                      ),
                    },
                    {
                      name: "Other",
                      color: "bg-gray-500",
                      icon: (
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
                            d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                          />
                        </svg>
                      ),
                    },
                  ].map((nature) => {
                    const count = requests.filter(
                      (r) => r.nature === nature.name,
                    ).length;
                    const percentage =
                      stats.total > 0
                        ? Math.round((count / stats.total) * 100)
                        : 0;
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
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <>
              {/* Minimal Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Requests
                  </p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
                  <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
                    Pending
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.pending}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.completed}
                  </p>
                </div>
              </div>

              {/* Nature Breakdown - Compact Bento */}
              <div className="bg-white rounded-lg p-4 mb-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                <h3 className="font-header text-base font-semibold text-gray-900 mb-3">
                  Requests by Nature
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { name: "Plumbing", color: "#3B82F6" },
                    { name: "Electrical", color: "#EAB308" },
                    { name: "Carpentry", color: "#92400E" },
                    { name: "HVAC", color: "#06B6D4" },
                    { name: "Cleaning", color: "#A855F7" },
                    { name: "Other", color: "#6B7280" },
                  ].map((nature) => {
                    const count = requests.filter(
                      (r) => r.nature === nature.name,
                    ).length;
                    const percentage =
                      stats.total > 0
                        ? Math.round((count / stats.total) * 100)
                        : 0;
                    return (
                      <div
                        key={nature.name}
                        className="text-center p-2 rounded hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-xs font-medium text-gray-700">
                          {nature.name}
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {count}
                        </p>
                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: nature.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Distribution - Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">
                    Status Overview
                  </h4>
                  <div className="flex items-end justify-around h-32 gap-2">
                    {[
                      {
                        status: "Pending",
                        count: stats.pending,
                        color: "#EAB308",
                      },
                      {
                        status: "In Progress",
                        count: stats.inProgress,
                        color: "#3B82F6",
                      },
                      {
                        status: "Completed",
                        count: stats.completed,
                        color: "#22C55E",
                      },
                    ].map((item) => {
                      const maxCount =
                        Math.max(
                          stats.pending,
                          stats.inProgress,
                          stats.completed,
                        ) || 1;
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div
                          key={item.status}
                          className="flex flex-col items-center flex-1"
                        >
                          <span className="text-xs font-semibold text-gray-700">
                            {item.count}
                          </span>
                          <div
                            className="w-full max-w-[40px] rounded-t-sm mt-1"
                            style={{
                              height: `${height}%`,
                              minHeight: item.count > 0 ? "6px" : "0",
                              backgroundColor: item.color,
                            }}
                          />
                          <span className="text-[10px] text-gray-500 mt-1">
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Distribution
                  </h4>
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-28 h-28">
                      {(() => {
                        const total =
                          stats.pending + stats.inProgress + stats.completed;
                        if (total === 0)
                          return (
                            <circle cx="50" cy="50" r="40" fill="#F3F4F6" />
                          );
                        const pendingPct = stats.pending / total;
                        const inProgressPct = stats.inProgress / total;
                        const pendingDash = pendingPct * 251.2;
                        const inProgressDash = inProgressPct * 251.2;
                        const completedDash = (stats.completed / total) * 251.2;
                        return (
                          <>
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#F3F4F6"
                              strokeWidth="16"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#EAB308"
                              strokeWidth="16"
                              strokeDasharray={`${pendingDash} 251.2`}
                              strokeDashoffset="0"
                              transform="rotate(-90 50 50)"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#3B82F6"
                              strokeWidth="16"
                              strokeDasharray={`${inProgressDash} 251.2`}
                              strokeDashoffset={`-${pendingDash}`}
                              transform="rotate(-90 50 50)"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#22C55E"
                              strokeWidth="16"
                              strokeDasharray={`${completedDash} 251.2`}
                              strokeDashoffset={`-${pendingDash + inProgressDash}`}
                              transform="rotate(-90 50 50)"
                            />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                    {[
                      { status: "Pending", color: "#EAB308" },
                      { status: "In Progress", color: "#3B82F6" },
                      { status: "Completed", color: "#22C55E" },
                    ].map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center gap-1"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-gray-500">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Master Queue Tab */}
          {activeTab === "master-queue" && (
            <div className="space-y-6">
              {/* Search Bar with Filter */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by nature, location, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`p-3 rounded-lg border transition-colors ${
                    showFilterPanel ||
                    filters.status.length > 0 ||
                    filters.nature.length > 0 ||
                    filters.urgency.length > 0
                      ? "bg-[#427A43] text-white border-[#427A43]"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                  title="Filter"
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
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </button>
              </div>

              {/* Filter Panel */}
              {showFilterPanel && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => setSelectAll(e.target.checked)}
                          className="w-4 h-4 text-[#427A43] rounded border-gray-300 focus:ring-[#427A43]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select all
                        </span>
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        setFilters({ status: [], nature: [], urgency: [] });
                        setSelectAll(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Clear filters"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Status
                      </p>
                      <div className="space-y-1">
                        {[
                          "Pending",
                          "In Progress",
                          "Completed",
                          "Cancelled",
                        ].map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectAll || filters.status.includes(status)
                              }
                              onChange={(e) => {
                                if (selectAll) {
                                  setSelectAll(false);
                                  setFilters({ ...filters, status: [status] });
                                } else {
                                  const newStatus = e.target.checked
                                    ? [...filters.status, status]
                                    : filters.status.filter(
                                        (s) => s !== status,
                                      );
                                  setFilters({ ...filters, status: newStatus });
                                }
                              }}
                              className="w-4 h-4 text-[#427A43] rounded border-gray-300 focus:ring-[#427A43]"
                            />
                            <span className="text-sm text-gray-700">
                              {status}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Nature Filter */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Nature
                      </p>
                      <div className="space-y-1">
                        {[
                          "Plumbing",
                          "Electrical",
                          "Carpentry",
                          "HVAC",
                          "Cleaning",
                          "Other",
                        ].map((nature) => (
                          <label
                            key={nature}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectAll || filters.nature.includes(nature)
                              }
                              onChange={(e) => {
                                if (selectAll) {
                                  setSelectAll(false);
                                  setFilters({ ...filters, nature: [nature] });
                                } else {
                                  const newNature = e.target.checked
                                    ? [...filters.nature, nature]
                                    : filters.nature.filter(
                                        (n) => n !== nature,
                                      );
                                  setFilters({ ...filters, nature: newNature });
                                }
                              }}
                              className="w-4 h-4 text-[#427A43] rounded border-gray-300 focus:ring-[#427A43]"
                            />
                            <span className="text-sm text-gray-700">
                              {nature}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Urgency Filter */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Urgency
                      </p>
                      <div className="space-y-1">
                        {["Emergency", "Urgent", "Normal"].map((urgency) => (
                          <label
                            key={urgency}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectAll || filters.urgency.includes(urgency)
                              }
                              onChange={(e) => {
                                if (selectAll) {
                                  setSelectAll(false);
                                  setFilters({
                                    ...filters,
                                    urgency: [urgency],
                                  });
                                } else {
                                  const newUrgency = e.target.checked
                                    ? [...filters.urgency, urgency]
                                    : filters.urgency.filter(
                                        (u) => u !== urgency,
                                      );
                                  setFilters({
                                    ...filters,
                                    urgency: newUrgency,
                                  });
                                }
                              }}
                              className="w-4 h-4 text-[#427A43] rounded border-gray-300 focus:ring-[#427A43]"
                            />
                            <span className="text-sm text-gray-700">
                              {urgency}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-header text-lg font-semibold text-gray-900">
                    All Maintenance Requests
                  </h2>
                  <p className="text-sm text-gray-600">
                    {requests.length} total requests
                  </p>
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
                    <tbody className="divide-y divide-gray-200">
                      {requests
                        .filter((r) => {
                          const matchesSearch =
                            searchQuery === "" ||
                            r.nature
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            r.location
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            r.description
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase());
                          const matchesStatus =
                            selectAll ||
                            filters.status.length === 0 ||
                            filters.status.includes(r.status);
                          const matchesNature =
                            selectAll ||
                            filters.nature.length === 0 ||
                            filters.nature.includes(r.nature);
                          const matchesUrgency =
                            selectAll ||
                            filters.urgency.length === 0 ||
                            filters.urgency.includes(r.urgency);
                          return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesNature &&
                            matchesUrgency
                          );
                        })
                        .map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {request.nature}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.location}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(
                                  request.created_at,
                                ).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {request.profiles?.full_name || "Unknown"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.profiles?.visual_role}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs">
                                <p className="text-sm text-gray-900 truncate">
                                  {request.description}
                                </p>
                                {request.photos &&
                                  request.photos.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {request.photos
                                        .slice(0, 2)
                                        .map((photo, idx) => (
                                          <img
                                            key={idx}
                                            src={photo}
                                            alt=""
                                            className="w-8 h-8 object-cover rounded"
                                            onClick={() =>
                                              setSelectedPhoto(photo)
                                            }
                                          />
                                        ))}
                                      {request.photos.length > 2 && (
                                        <span className="text-xs text-gray-500 self-center">
                                          +{request.photos.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${request.urgency === "Emergency" ? "bg-red-100 text-red-700" : request.urgency === "Urgent" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}`}
                                >
                                  {request.urgency}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${request.status === "Pending" ? "bg-yellow-100 text-yellow-700" : request.status === "In Progress" ? "bg-blue-100 text-blue-700" : request.status === "Completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                              >
                                {request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {/* Status Dropdown */}
                                <select
                                  value={request.status}
                                  onChange={(e) =>
                                    handleStatusUpdate(
                                      request.id,
                                      e.target.value as RequestStatus,
                                    )
                                  }
                                  className={`text-xs px-2 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-[#427A43] cursor-pointer ${
                                    request.status === "Pending"
                                      ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                                      : request.status === "In Progress"
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : request.status === "Completed"
                                          ? "bg-green-50 border-green-200 text-green-700"
                                          : "bg-red-50 border-red-200 text-red-700"
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">
                                    In Progress
                                  </option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>

                                {/* Report Button */}
                                <button
                                  onClick={() => {
                                    setSelectedRequestForReport(request);
                                    setShowReportSidebar(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-[#427A43] hover:bg-gray-100 rounded transition-colors"
                                  title="Generate Report"
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
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() =>
                                    handleDeleteRequest(request.id)
                                  }
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Delete Request"
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
                  {requests.filter((r) => {
                    const matchesSearch =
                      searchQuery === "" ||
                      r.nature
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      r.location
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      r.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    const matchesStatus =
                      selectAll ||
                      filters.status.length === 0 ||
                      filters.status.includes(r.status);
                    const matchesNature =
                      selectAll ||
                      filters.nature.length === 0 ||
                      filters.nature.includes(r.nature);
                    const matchesUrgency =
                      selectAll ||
                      filters.urgency.length === 0 ||
                      filters.urgency.includes(r.urgency);
                    return (
                      matchesSearch &&
                      matchesStatus &&
                      matchesNature &&
                      matchesUrgency
                    );
                  }).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>No requests found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manage Users Tab - Broadcast Only */}
        {activeTab === "manage-users" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-header text-lg font-semibold text-gray-900">
                Announcements
              </h2>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="px-4 py-2 bg-[#427A43] text-white rounded-lg hover:bg-[#366337] transition-colors flex items-center gap-2 text-sm font-medium"
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
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
                Send Announcement
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-[#427A43]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Broadcast Announcements
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Send important announcements to all users at once. Messages will
                appear as notifications in their dashboard.
              </p>
            </div>

            {/* Recent Broadcasts */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-4">
                Recent Announcements
              </h3>
              <div className="space-y-3">
                {userMessages["broadcast"]?.length > 0 ? (
                  userMessages["broadcast"]
                    .slice(-5)
                    .reverse()
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <p className="text-gray-700">{msg.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-400 text-sm">
                    No announcements sent yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#427A43] p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-header text-xl font-bold text-white">
                  Change Status
                </h2>
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
          <div className="bg-[#427A43] shadow-lg border-b transition-all duration-300 p-6 sticky top-0 z-10">
            <div className="flex justify-center items-center">
              <h2 className="font-header text-xl font-bold text-white">
                Notifications
              </h2>
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
            <div className="bg-[#427A43] shadow-lg border-b transition-all duration-300 p-6 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h2 className="font-header text-xl font-bold text-white">
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
                <h3 className="font-header text-lg font-semibold text-gray-900 mb-4">
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
                    <span className="px-3 py-1 bg-[#427A43] text-white text-sm font-medium rounded-full">
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

      {/* Report Sidebar */}
      <>
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${showReportSidebar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => setShowReportSidebar(false)}
        />
        <div
          className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-500 ease-out ${showReportSidebar ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full overflow-y-auto">
            <div className="bg-[#427A43] shadow-lg border-b p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-header text-xl font-bold text-white">
                    Maintenance Report
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Edit and generate report for this request
                  </p>
                </div>
                <button
                  onClick={() => setShowReportSidebar(false)}
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

            {selectedRequestForReport && (
              <div className="p-6 space-y-6">
                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Nature
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedRequestForReport.nature}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Location
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedRequestForReport.location}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Urgency
                    </label>
                    <select
                      defaultValue={selectedRequestForReport.urgency}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Status
                    </label>
                    <select
                      defaultValue={selectedRequestForReport.status}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Description
                    </label>
                    <textarea
                      defaultValue={selectedRequestForReport.description}
                      rows={4}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Requester Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-header text-sm font-semibold text-gray-900">
                    Requester Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-gray-900">
                        {selectedRequestForReport.profiles?.full_name ||
                          "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-gray-900">
                        {selectedRequestForReport.profiles?.visual_role ||
                          "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-gray-900">
                        {new Date(
                          selectedRequestForReport.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Request ID</p>
                      <p className="text-gray-900 text-xs font-mono">
                        {selectedRequestForReport.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Admin Notes
                  </label>
                  <textarea
                    placeholder="Add notes about this maintenance request..."
                    rows={4}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowReportSidebar(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert("Report saved successfully!");
                      setShowReportSidebar(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-[#427A43] text-white font-medium rounded-lg hover:bg-[#366337] transition-colors"
                  >
                    Save Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>

      {/* AI Chat Sidebar */}
      <div
        ref={aiChatRef}
        className={`fixed top-0 left-0 h-full w-96 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-40 transform transition-all duration-700 ease-out ${
          showAIChat ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-[#427A43] via-emerald-600 to-green-600 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#427A43]/30 to-emerald-600/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-header text-xl font-bold text-white">
                      AI Assistant
                    </h2>
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Always ready to help
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-white hover:bg-white/30 transition-all duration-200 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5"
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
                  Quick Actions
                </button>
                <button className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-white hover:bg-white/30 transition-all duration-200 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Insights
                </button>
                <button className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-white hover:bg-white/30 transition-all duration-200 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Help
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Chat Area */}
          <div className="flex-1 flex items-center justify-center p-6 relative">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#427A43]/5 via-transparent to-emerald-600/5"></div>
              <div className="grid grid-cols-8 grid-rows-8 h-full opacity-10">
                {[...Array(64)].map((_, i) => (
                  <div key={i} className="border border-white/10"></div>
                ))}
              </div>
              {/* Floating particles */}
              <div className="absolute top-10 left-10 w-2 h-2 bg-white/20 rounded-full animate-float"></div>
              <div className="absolute top-20 right-20 w-3 h-3 bg-emerald-400/20 rounded-full animate-float-delayed"></div>
              <div className="absolute bottom-20 left-20 w-2 h-2 bg-white/15 rounded-full animate-float"></div>
            </div>

            <div className="text-center relative z-10">
              {/* Enhanced AI Icon with glow effect */}
              <div className="w-32 h-32 mx-auto mb-6 relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#427A43]/20 to-emerald-600/20 rounded-full blur-xl animate-pulse"></div>
                {/* Middle ring */}
                <div className="absolute inset-2 bg-gradient-to-br from-[#427A43]/30 to-emerald-600/30 rounded-full blur-lg animate-pulse"></div>
                {/* Inner circle */}
                <div className="absolute inset-4 bg-gradient-to-br from-[#427A43]/40 to-emerald-600/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg
                    className="w-16 h-16 text-white/80 relative z-10 drop-shadow-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                {/* Orbiting dots */}
                <div className="absolute inset-0">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/60 rounded-full animate-orbit"></div>
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400/60 rounded-full animate-orbit"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full animate-orbit"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400/50 rounded-full animate-orbit"
                    style={{ animationDelay: "1.5s" }}
                  ></div>
                </div>
              </div>

              <h3 className="font-header text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Coming Soon
              </h3>
              <p className="text-sm text-white/70 mb-8 max-w-sm mx-auto leading-relaxed">
                Experience AI-powered maintenance management with intelligent
                automation, predictive insights, and seamless workflow
                optimization
              </p>

              {/* Enhanced Feature Preview */}
              <div className="space-y-3 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 group hover:bg-white/10 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#427A43] to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-4 h-4 text-white"
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
                  <div>
                    <p className="text-sm font-medium text-white">
                      Smart Prioritization
                    </p>
                    <p className="text-xs text-white/60">
                      AI-powered request ranking
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 group hover:bg-white/10 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#427A43] to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Predictive Analytics
                    </p>
                    <p className="text-xs text-white/60">
                      Data-driven insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 group hover:bg-white/10 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#427A43] to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Workflow Automation
                    </p>
                    <p className="text-xs text-white/60">
                      Streamlined processes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Input Area */}
          <div className="p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <button className="p-2 text-white/40 hover:text-white/60 transition-colors">
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
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
                <button className="p-2 text-white/40 hover:text-white/60 transition-colors">
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
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <button className="p-2 text-white/40 hover:text-white/60 transition-colors">
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
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Ask me anything about maintenance..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#427A43] focus:border-transparent transition-all duration-200"
                disabled
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#427A43] text-white rounded-lg hover:bg-[#4d8c4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-white/40">
                AI assistant is getting ready
              </p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[#427A43] rounded-full animate-bounce"></div>
                <div
                  className="w-1.5 h-1.5 bg-[#427A43] rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-[#427A43] rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPhoto}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2"
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
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-header text-lg font-semibold text-gray-900">
                  Broadcast Message to All Users
                </h3>
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                This message will be sent to all users and will appear in their
                notifications.
              </p>
            </div>
            <div className="p-6">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your broadcast message here..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#427A43] focus:border-transparent resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBroadcastMessage}
                  disabled={!broadcastMessage.trim()}
                  className="px-4 py-2 bg-[#427A43] text-white rounded-lg hover:bg-[#366337] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send to All ({users.length} users)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Info Panel */}
      {showUserInfoPanel && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-header text-lg font-semibold text-gray-900">
                  User Information
                </h3>
                <button
                  onClick={() => setShowUserInfoPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#427A43] flex items-center justify-center text-white text-2xl font-semibold">
                      {selectedUser.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${selectedUser.is_blocked ? "bg-red-400" : "bg-green-400"}`}
                  ></div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedUser.full_name}
                  </h4>
                  <p className="text-gray-500">
                    {selectedUser.visual_role || "User"}
                  </p>
                  {selectedUser.is_blocked && (
                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      Blocked
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Department</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.department || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Education Level</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.educational_level || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.created_at
                        ? new Date(selectedUser.created_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowUserInfoPanel(false);
                    setSelectedUser(selectedUser);
                    fetchUserMessages(selectedUser.id);
                  }}
                  className="flex-1 px-4 py-2 bg-[#427A43] text-white rounded-lg hover:bg-[#366337] transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Send Message
                </button>
                <button
                  onClick={() => {
                    toggleBlockUser(selectedUser.id);
                    setShowUserInfoPanel(false);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                    blockedUsers.includes(selectedUser.id)
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
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
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  {blockedUsers.includes(selectedUser.id) ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
