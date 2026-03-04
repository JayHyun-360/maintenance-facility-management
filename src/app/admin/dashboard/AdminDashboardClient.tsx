"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type {
  Profile,
  MaintenanceRequest,
  RequestStatus,
  ThemePreference,
} from "@/types/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Zap,
  Hammer,
  Wind,
  Sparkles,
  MoreHorizontal,
  TrendingUp,
  Activity,
  BarChart3,
} from "lucide-react";

// Debounce hook for performance optimization
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

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
    "overview" | "analytics" | "master-queue" | "manage-users" | "announcements"
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
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());
  const [editingRequest, setEditingRequest] =
    useState<RequestWithProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotificationMenu, setOpenNotificationMenu] = useState<
    string | null
  >(null);
  const [emergencyPopup, setEmergencyPopup] = useState<any>(null);
  const emergencyShownRef = useRef<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showReportSidebar, setShowReportSidebar] = useState(false);
  const [selectedRequestForReport, setSelectedRequestForReport] =
    useState<RequestWithProfile | null>(null);

  // Enhanced Report Form State
  const [reportFormData, setReportFormData] = useState({
    // Nature of Request
    natureOfRequest: {
      plumbing: false,
      carpentry: false,
      electrical: false,
      personnelServices: false,
    },
    urgency: "Not Urgent",
    date: "",
    time: "",

    // Table Data
    location: "",
    descriptionOfProblem: "",
    whatWillBeDone: "",
    supportingReasons: "",

    // Request/Approval Section
    requestingDepartment: "",
    nameOfEmployee: "",
    departmentHead: "",
    vpAASD: "",
    gmsHead: "",

    // Work Evaluation
    dateTimeReceived: "",
    performedBy: "",
    dateTimeCompleted: "",
    acknowledgeBy: "",
    workEvaluation: "Satisfactory",
  });
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
  const [showDetailModal, setShowDetailModal] =
    useState<RequestWithProfile | null>(null);
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
    console.log("Fetching notifications for admin:", userId);

    // Fetch real notifications from database - only admin notifications
    const { data: dbNotifications } = await (
      supabase.from("notifications") as any
    )
      .select("*")
      .eq("user_id", userId)
      .eq("target_role", "admin")
      .order("created_at", { ascending: false })
      .limit(20);

    console.log("Database notifications:", dbNotifications);

    // Get emergency shown status from localStorage
    const emergencyStorageKey = `admin_emergency_shown_${userId}`;
    const storedEmergencyShown =
      typeof window !== "undefined"
        ? new Set<string>(
            JSON.parse(localStorage.getItem(emergencyStorageKey) || "[]"),
          )
        : new Set<string>();

    // Update ref with stored emergency shown status
    emergencyShownRef.current = storedEmergencyShown;

    // Use database notifications directly
    const notificationsData = dbNotifications || [];

    // Update state with database notifications
    setNotifications(notificationsData);

    // Update unread count
    const unreadCount = notificationsData.filter((n: any) => !n.is_read).length;
    setUnreadCount(unreadCount);

    // Check for emergency requests and show popup (only once per emergency ID)
    const unreadEmergencies = notificationsData.filter(
      (n: any) =>
        !n.is_read &&
        (n.title.includes("EMERGENCY") || n.message.includes("EMERGENCY")),
    );

    // Show first emergency that hasn't been shown yet
    const newEmergency = unreadEmergencies.find(
      (n: any) => !emergencyShownRef.current.has(n.id),
    );

    if (newEmergency && !emergencyPopup) {
      emergencyShownRef.current.add(newEmergency.id);
      // Save to localStorage
      localStorage.setItem(
        emergencyStorageKey,
        JSON.stringify([...emergencyShownRef.current]),
      );
      // Use setTimeout to avoid calling setState during render
      setTimeout(() => {
        setEmergencyPopup(newEmergency);
      }, 0);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Persist to database
    await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("id", notificationId);
  };

  const markAllNotificationsRead = async () => {
    // Update local state
    setNotifications((prev) => {
      // Also mark all current emergencies as shown so popup doesn't reappear
      const unreadEmergencies = prev.filter(
        (n) => !n.is_read && n.title.includes("EMERGENCY"),
      );
      unreadEmergencies.forEach((e) => emergencyShownRef.current.add(e.id));
      return prev.map((notif) => ({ ...notif, is_read: true }));
    });
    setUnreadCount(0);

    // Persist all to database
    await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    // Save emergency shown status to localStorage
    const emergencyStorageKey = `admin_emergency_shown_${userId}`;
    localStorage.setItem(
      emergencyStorageKey,
      JSON.stringify([...emergencyShownRef.current]),
    );
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setOpenNotificationMenu(null);
  };

  const deleteAllReadNotifications = async () => {
    setNotifications((prev) => prev.filter((notif) => !notif.is_read));
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const togglePhotos = (requestId: string) => {
    setExpandedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
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

  // Generate chart data for status trends over time
  const generateStatusTrendData = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30); // Last 30 days

    const dates = eachDayOfInterval({ start: startDate, end: endDate });

    return dates.map((date) => {
      const dateStr = format(date, "MM/dd");
      const dayStart = startOfDay(date);
      const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);

      const dayRequests = requests.filter((req) => {
        const reqDate = new Date(req.created_at);
        return reqDate >= dayStart && reqDate <= dayEnd;
      });

      return {
        date: dateStr,
        pending: dayRequests.filter((r) => r.status === "Pending").length,
        inProgress: dayRequests.filter((r) => r.status === "In Progress")
          .length,
        completed: dayRequests.filter((r) => r.status === "Completed").length,
        total: dayRequests.length,
      };
    });
  };

  // Memoized RequestRow component for performance
  const RequestRow = React.memo(
    ({ request }: { request: RequestWithProfile }) => {
      const isExpanded = expandedPhotos.has(request.id);

      return (
        <tr
          id={`request-${request.id}`}
          key={request.id}
          className="hover:bg-gray-50"
        >
          <td className="px-6 py-4">
            <div className="text-sm font-medium text-gray-900">
              {request.nature}
            </div>
            <div className="text-sm text-gray-500">{request.location}</div>
            <div className="text-xs text-gray-400">
              {new Date(request.created_at).toLocaleDateString()}
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
              <div className="flex items-start gap-2">
                <p
                  className="text-sm text-gray-900 truncate"
                  style={{ maxWidth: "200px" }}
                >
                  {request.description}
                </p>
                {request.description && request.description.length > 50 && (
                  <button
                    onClick={() => setShowDetailModal(request)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-[#427A43] hover:bg-gray-100 rounded transition-colors"
                    title="See more information"
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {request.photos && request.photos.length > 0 && (
                <div className="mt-2">
                  {!isExpanded ? (
                    <button
                      onClick={() => togglePhotos(request.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      View {request.photos.length} Photo
                      {request.photos.length > 1 ? "s" : ""}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {request.photos.slice(0, 2).map((photo, idx) => (
                          <img
                            key={`${request.id}-photo-${idx}`}
                            src={photo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedPhoto(photo)}
                          />
                        ))}
                        {request.photos.length > 2 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{request.photos.length - 2}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => togglePhotos(request.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Hide photos
                      </button>
                    </div>
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
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              {/* Report Button */}
              <button
                onClick={() => {
                  setSelectedRequestForReport(request);
                  setShowReportSidebar(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#427A43] text-white text-xs font-medium rounded hover:bg-[#366337] transition-colors shadow-sm hover:shadow-md"
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
                    d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8m5-4h4"
                  />
                </svg>
                <span>Report</span>
              </button>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteRequest(request.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
      );
    },
  );

  RequestRow.displayName = "RequestRow";

  // Generate distribution data for pie chart
  const generateDistributionData = () => {
    const total = stats.pending + stats.inProgress + stats.completed;
    if (total === 0) return [];

    return [
      { name: "Pending", value: stats.pending, color: "#EAB308" },
      { name: "In Progress", value: stats.inProgress, color: "#3B82F6" },
      { name: "Completed", value: stats.completed, color: "#22C55E" },
    ];
  };

  // Memoized filtered requests for performance
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        debouncedSearchQuery === "" ||
        r.nature.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        r.location.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        r.description
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());
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
      return matchesSearch && matchesStatus && matchesNature && matchesUrgency;
    });
  }, [requests, debouncedSearchQuery, filters, selectAll]);

  // PDF Generation Function
  const generatePDFReport = async () => {
    if (!selectedRequestForReport) return;

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 16;
      const left = marginX;
      const right = pageWidth - marginX;
      const contentWidth = right - left;

      pdf.setDrawColor(0);
      pdf.setTextColor(0);
      pdf.setLineWidth(0.18);

      const headerGray: [number, number, number] = [90, 90, 90];
      const bodyBlack: [number, number, number] = [0, 0, 0];

      // Header (small, centered as in the scan)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("DE LA SALLE JOHN BOSCO COLLEGE", pageWidth / 2, 16, {
        align: "center",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Mangagoy, Bislig City, Surigao del Sur", pageWidth / 2, 20, {
        align: "center",
      });

      // TO line
      pdf.setFontSize(9);
      pdf.setTextColor(...headerGray);
      pdf.text("TO:", left, 29);
      pdf.setTextColor(...bodyBlack);
      pdf.line(left + 10, 29.5, left + 95, 29.5);

      // Title box
      pdf.setLineWidth(0.45);
      pdf.rect(left, 33.5, contentWidth, 13.5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("PHYSICAL PLANT / FACILITIES REQUEST", pageWidth / 2, 41.8, {
        align: "center",
      });

      // NATURE OF REQUEST caption under title (centered)
      pdf.setFontSize(10);
      pdf.setTextColor(...headerGray);
      pdf.text("NATURE OF REQUEST", pageWidth / 2, 52.5, { align: "center" });
      pdf.setTextColor(...bodyBlack);

      // Combined block (Nature | Urgency | Date/Time) with grid
      const blockY = 56.5;
      const blockH = 29;
      const col1 = 66;
      const col2 = 66;
      const col3 = contentWidth - col1 - col2;

      pdf.setLineWidth(0.22);
      pdf.rect(left, blockY, contentWidth, blockH);
      pdf.line(left + col1, blockY, left + col1, blockY + blockH);
      pdf.line(left + col1 + col2, blockY, left + col1 + col2, blockY + blockH);

      // Nature checkboxes (left column, vertical)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const natureOptions = [
        { key: "plumbing", label: "PLUMBING" },
        { key: "carpentry", label: "CARPENTRY" },
        { key: "electrical", label: "ELECTRICAL" },
        { key: "personnelServices", label: "PERSONNEL SERVICES" },
      ];
      let ny = blockY + 7.5;
      const nx = left + 6;
      natureOptions.forEach((opt) => {
        pdf.rect(nx, ny - 4, 6, 6);
        if (
          reportFormData.natureOfRequest[
            opt.key as keyof typeof reportFormData.natureOfRequest
          ]
        ) {
          pdf.line(nx, ny - 4, nx + 6, ny + 2);
          pdf.line(nx, ny + 2, nx + 6, ny - 4);
        }
        pdf.text(opt.label, nx + 10, ny + 1);
        ny += 7;
      });

      // Urgency checkboxes (middle column)
      const ux = left + col1 + 6;
      let uy = blockY + 7.5;
      const urgencyOptions = ["Very Urgent/Emergency", "Urgent", "Not Urgent"];
      urgencyOptions.forEach((opt) => {
        pdf.rect(ux, uy - 4, 6, 6);
        if (reportFormData.urgency === opt) {
          pdf.line(ux, uy - 4, ux + 6, uy + 2);
          pdf.line(ux, uy + 2, ux + 6, uy - 4);
        }
        pdf.setFontSize(8.5);
        pdf.text(opt, ux + 10, uy + 1);
        pdf.setFontSize(9);
        uy += 8;
      });

      // Date / Time underlines (right column)
      const dx = left + col1 + col2 + 6;
      const dateY = blockY + 12.5;
      const timeY = blockY + 23;
      pdf.text("Date:", dx, dateY);
      pdf.line(dx + 14, dateY + 0.5, right - 6, dateY + 0.5);
      pdf.text("Time:", dx, timeY);
      pdf.line(dx + 14, timeY + 0.5, right - 6, timeY + 0.5);
      pdf.setFontSize(8);
      pdf.text(`${reportFormData.date || ""}`, dx + 16, dateY);
      pdf.text(`${reportFormData.time || ""}`, dx + 16, timeY);

      // Main request table with full grid (header + rows)
      const tableTop = blockY + blockH + 7.5;
      const headerH = 8;
      const rowH = 6.8;
      const rows = 8;
      const tableH = headerH + rowH * rows;
      // Slightly rebalance columns so long headers fit better
      const w1 = 48;
      const w2 = 58;
      const w3 = 52;
      const w4 = contentWidth - (w1 + w2 + w3);
      const colW = [w1, w2, w3, w4];

      pdf.setFont("helvetica", "bold");
      // Smaller header font so titles fit like the printed form
      pdf.setFontSize(7.5);
      pdf.rect(left, tableTop, contentWidth, tableH);
      // vertical lines
      let vx = left;
      for (let i = 0; i < colW.length - 1; i++) {
        vx += colW[i];
        pdf.line(vx, tableTop, vx, tableTop + tableH);
      }
      // header line
      pdf.line(left, tableTop + headerH, right, tableTop + headerH);
      // row lines
      for (let i = 1; i <= rows; i++) {
        const yy = tableTop + headerH + rowH * i;
        pdf.line(left, yy, right, yy);
      }

      const headerTexts = [
        ["LOCATION"],
        ["DESCRIPTION OF", "PROBLEM"],
        ["WHAT WILL BE", "DONE"],
        ["SUPPORTING", "REASON(S)"],
      ];
      const colX = [
        left + 3,
        left + colW[0] + 3,
        left + colW[0] + colW[1] + 3,
        left + colW[0] + colW[1] + colW[2] + 3,
      ];
      pdf.setTextColor(...headerGray);
      headerTexts.forEach((lines, idx) => {
        lines.forEach((line, li) => {
          pdf.text(line, colX[idx], tableTop + 5 + li * 3.5);
        });
      });
      pdf.setTextColor(...bodyBlack);

      // Fill first row with values only (rest blank like the form)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const firstRowY = tableTop + headerH + 4.5;
      const values = [
        reportFormData.location || selectedRequestForReport.location || "",
        reportFormData.descriptionOfProblem ||
          selectedRequestForReport.description ||
          "",
        reportFormData.whatWillBeDone || "",
        reportFormData.supportingReasons || "",
      ];
      values.forEach((val, idx) => {
        const maxW = colW[idx] - 6;
        const lines = pdf.splitTextToSize(val, maxW);
        lines.slice(0, 2).forEach((line: string, li: number) => {
          pdf.text(line, colX[idx], firstRowY + li * 3.8);
        });
      });

      // Signature area (two columns with lines)
      const sigTop = tableTop + tableH + 10;
      pdf.setFontSize(7.5);
      pdf.setTextColor(...headerGray);
      pdf.text("Requested by: (Requesting Department)", left, sigTop);
      pdf.text(
        "Approved by: Administrative Affairs & Services Division",
        left + contentWidth / 2,
        sigTop,
      );
      pdf.setTextColor(...bodyBlack);

      const half = contentWidth / 2;
      const lineY1 = sigTop + 11;
      const lineY2 = sigTop + 22;
      pdf.line(left + 8, lineY1, left + half - 8, lineY1);
      pdf.line(left + half + 8, lineY1, right - 8, lineY1);
      pdf.setTextColor(...headerGray);
      pdf.text("Name of Employee", left + 28, lineY1 + 5);
      pdf.text("VP - AASD", left + half + 38, lineY1 + 5);
      pdf.setTextColor(...bodyBlack);

      pdf.line(left + 8, lineY2, left + half - 8, lineY2);
      pdf.line(left + half + 8, lineY2, right - 8, lineY2);
      pdf.setTextColor(...headerGray);
      pdf.text("Department Head", left + 30, lineY2 + 5);
      pdf.text("GMS Head", left + half + 38, lineY2 + 5);
      pdf.setTextColor(...bodyBlack);

      // Work Evaluation block (boxed, with right rating table)
      const weTop = sigTop + 29;
      const weH = 36;
      const weLeftW = 118;
      const weMidW = 26;
      pdf.rect(left, weTop, contentWidth, weH);
      pdf.line(left + weLeftW, weTop, left + weLeftW, weTop + weH);
      pdf.line(
        left + weLeftW + weMidW,
        weTop,
        left + weLeftW + weMidW,
        weTop + weH,
      );

      const weRowH = weH / 4;
      for (let i = 1; i < 4; i++) {
        pdf.line(left, weTop + weRowH * i, left + weLeftW, weTop + weRowH * i);
        pdf.line(
          left + weLeftW + weMidW,
          weTop + weRowH * i,
          right,
          weTop + weRowH * i,
        );
      }

      pdf.setFontSize(8);
      const weLabels = [
        "Date/Time Received",
        "Performed by:",
        "Date/Time Completed",
        "Acknowledge by:",
      ];
      pdf.setTextColor(...headerGray);
      weLabels.forEach((label, i) => {
        pdf.text(label, left + 3, weTop + weRowH * i + 5);
      });
      pdf.setTextColor(...bodyBlack);

      pdf.setFont("helvetica", "bold");
      pdf.text("Work Evaluation", left + weLeftW + 3.5, weTop + weH / 2);
      pdf.setFont("helvetica", "normal");

      const ratings = [
        "Outstanding",
        "Very Satisfactory",
        "Satisfactory",
        "Poor",
      ];
      ratings.forEach((r, i) => {
        pdf.setFontSize(7.5);
        pdf.text(r, left + weLeftW + weMidW + 5, weTop + weRowH * i + 5);
        pdf.setFontSize(8);
      });

      // Fill we values (small)
      pdf.setFontSize(7.5);
      const weValues = [
        reportFormData.dateTimeReceived || "",
        reportFormData.performedBy || "",
        reportFormData.dateTimeCompleted || "",
        reportFormData.acknowledgeBy || "",
      ];
      weValues.forEach((v, i) => {
        const y = weTop + weRowH * i + 5;
        const x = left + 42;
        const maxW = weLeftW - 45;
        const lines = pdf.splitTextToSize(v, maxW);
        pdf.text(lines[0] || "", x, y);
      });

      // Bottom rating descriptions
      const descTop = weTop + weH + 7;
      pdf.setFontSize(7.5);
      const descMidX = left + 46;
      const descRows = [
        {
          k: "Outstanding",
          v: "Excellent Workmanship. Completed before the date needed/required.",
        },
        {
          k: "Very Satisfactory",
          v: "Above Average Workmanship. Completed before the date needed/required.",
        },
        {
          k: "Satisfactory",
          v: "Average/Acceptable Workmanship. Completed on the date needed.",
        },
        {
          k: "Poor",
          v: "Messy/Unacceptable Workmanship. Very late.",
        },
      ];
      descRows.forEach((row, i) => {
        const y = descTop + i * 5;
        pdf.text(row.k, left, y);
        const lines = pdf.splitTextToSize(row.v, right - descMidX);
        pdf.text(lines[0] || "", descMidX, y);
      });

      // Save PDF
      pdf.save(
        `maintenance-form-${selectedRequestForReport.id.slice(0, 8)}.pdf`,
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF form. Please try again.");
    }
  };

  // Initialize form data when request is selected
  useEffect(() => {
    if (selectedRequestForReport) {
      setReportFormData((prev) => ({
        ...prev,
        location: selectedRequestForReport.location,
        descriptionOfProblem: selectedRequestForReport.description,
        urgency:
          selectedRequestForReport.urgency === "Emergency"
            ? "Very Urgent/Emergency"
            : selectedRequestForReport.urgency === "Urgent"
              ? "Urgent"
              : "Not Urgent",
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        nameOfEmployee: selectedRequestForReport.profiles?.full_name || "",
        dateTimeReceived: new Date().toLocaleString(),
      }));
    }
  }, [selectedRequestForReport]);

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
              id: "announcements",
              label: "Announcements",
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

              {/* Nature Breakdown - Most Requests (Top 3) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl shadow-lg border border-gray-100/50 p-8 mb-8 backdrop-blur-sm relative overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-400/5 to-cyan-400/5 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                      >
                        <BarChart3 className="w-6 h-6 text-white" />
                      </motion.div>
                      <div>
                        <h2 className="font-bold text-xl text-gray-900 tracking-tight">
                          Most Requests by Nature
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Top 3 maintenance request categories
                        </p>
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-100"
                    >
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-700">
                        {stats.total}
                      </span>
                      <span className="text-sm text-gray-500">
                        total requests
                      </span>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        name: "Plumbing",
                        color: "from-blue-500 to-blue-600",
                        bgLight: "bg-blue-50",
                        icon: Wrench,
                        gradient:
                          "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                      },
                      {
                        name: "Electrical",
                        color: "from-yellow-500 to-orange-500",
                        bgLight: "bg-yellow-50",
                        icon: Zap,
                        gradient:
                          "linear-gradient(135deg, #EAB308 0%, #F97316 100%)",
                      },
                      {
                        name: "Carpentry",
                        color: "from-amber-600 to-amber-700",
                        bgLight: "bg-amber-50",
                        icon: Hammer,
                        gradient:
                          "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                      },
                      {
                        name: "HVAC",
                        color: "from-cyan-500 to-cyan-600",
                        bgLight: "bg-cyan-50",
                        icon: Wind,
                        gradient:
                          "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
                      },
                      {
                        name: "Cleaning",
                        color: "from-purple-500 to-purple-600",
                        bgLight: "bg-purple-50",
                        icon: Sparkles,
                        gradient:
                          "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
                      },
                      {
                        name: "Other",
                        color: "from-gray-500 to-gray-600",
                        bgLight: "bg-gray-50",
                        icon: MoreHorizontal,
                        gradient:
                          "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
                      },
                    ]
                      .map((nature) => ({
                        ...nature,
                        count: requests.filter((r) => r.nature === nature.name)
                          .length,
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 3)
                      .map((nature, index) => {
                        const count = requests.filter(
                          (r) => r.nature === nature.name,
                        ).length;
                        const percentage =
                          stats.total > 0
                            ? Math.round((count / stats.total) * 100)
                            : 0;
                        const Icon = nature.icon;

                        return (
                          <motion.div
                            key={nature.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.1 * index,
                              duration: 0.4,
                              ease: "easeOut",
                            }}
                            whileHover={{
                              y: -4,
                              scale: 1.02,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative"
                          >
                            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                              {/* Animated background gradient */}
                              <motion.div
                                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                                style={{ background: nature.gradient }}
                              />

                              {/* Top decoration line */}
                              <motion.div
                                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${nature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                                initial={{ scaleX: 0 }}
                                whileHover={{ scaleX: 1 }}
                                transition={{ duration: 0.3 }}
                              />

                              <div className="relative z-10">
                                {/* Icon section */}
                                <div className="flex items-center justify-between mb-4">
                                  <motion.div
                                    className={`p-3 rounded-xl ${nature.bgLight} group-hover:scale-110 transition-transform duration-300`}
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <Icon
                                      className="w-5 h-5"
                                      style={{
                                        color:
                                          nature.gradient.match(
                                            /#[0-9A-F]{6}/,
                                          )?.[0] || "#000",
                                      }}
                                    />
                                  </motion.div>
                                  {count > 0 && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.2 + index * 0.1 }}
                                      className="w-2 h-2 bg-green-400 rounded-full"
                                    />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="space-y-3">
                                  <div>
                                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-gray-700 transition-colors">
                                      {nature.name}
                                    </h3>
                                  </div>

                                  <div className="flex items-baseline gap-2">
                                    <motion.span
                                      className="text-2xl font-bold text-gray-900"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.3 + index * 0.1 }}
                                    >
                                      {count}
                                    </motion.span>
                                    <span className="text-sm text-gray-500 font-medium">
                                      {percentage}%
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full bg-gradient-to-r ${nature.color} rounded-full relative`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{
                                        delay: 0.4 + index * 0.1,
                                        duration: 0.8,
                                        ease: "easeOut",
                                      }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                                    </motion.div>
                                  </div>

                                  {count > 0 && (
                                    <motion.p
                                      className="text-xs text-gray-400"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.5 + index * 0.1 }}
                                    >
                                      {count === 1 ? "request" : "requests"}
                                    </motion.p>
                                  )}
                                </div>
                              </div>

                              {/* Hover tooltip */}
                              <AnimatePresence>
                                <motion.div
                                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 whitespace-nowrap"
                                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="font-semibold">
                                    {nature.name}
                                  </div>
                                  <div>
                                    {count} requests ({percentage}% of total)
                                  </div>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
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

              {/* Nature Breakdown - Requests by Nature (All) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl shadow-lg border border-gray-100/50 p-8 mb-8 backdrop-blur-sm relative overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-400/5 to-cyan-400/5 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                      >
                        <BarChart3 className="w-6 h-6 text-white" />
                      </motion.div>
                      <div>
                        <h2 className="font-bold text-xl text-gray-900 tracking-tight">
                          Requests by Nature
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Distribution of maintenance requests
                        </p>
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-100"
                    >
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-700">
                        {stats.total}
                      </span>
                      <span className="text-sm text-gray-500">
                        total requests
                      </span>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      {
                        name: "Plumbing",
                        color: "from-blue-500 to-blue-600",
                        bgLight: "bg-blue-50",
                        icon: Wrench,
                        gradient:
                          "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                      },
                      {
                        name: "Electrical",
                        color: "from-yellow-500 to-orange-500",
                        bgLight: "bg-yellow-50",
                        icon: Zap,
                        gradient:
                          "linear-gradient(135deg, #EAB308 0%, #F97316 100%)",
                      },
                      {
                        name: "Carpentry",
                        color: "from-amber-600 to-amber-700",
                        bgLight: "bg-amber-50",
                        icon: Hammer,
                        gradient:
                          "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                      },
                      {
                        name: "HVAC",
                        color: "from-cyan-500 to-cyan-600",
                        bgLight: "bg-cyan-50",
                        icon: Wind,
                        gradient:
                          "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
                      },
                      {
                        name: "Cleaning",
                        color: "from-purple-500 to-purple-600",
                        bgLight: "bg-purple-50",
                        icon: Sparkles,
                        gradient:
                          "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
                      },
                      {
                        name: "Other",
                        color: "from-gray-500 to-gray-600",
                        bgLight: "bg-gray-50",
                        icon: MoreHorizontal,
                        gradient:
                          "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
                      },
                    ].map((nature, index) => {
                      const count = requests.filter(
                        (r) => r.nature === nature.name,
                      ).length;
                      const percentage =
                        stats.total > 0
                          ? Math.round((count / stats.total) * 100)
                          : 0;
                      const Icon = nature.icon;

                      return (
                        <motion.div
                          key={nature.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.1 * index,
                            duration: 0.4,
                            ease: "easeOut",
                          }}
                          whileHover={{
                            y: -4,
                            scale: 1.02,
                            transition: { duration: 0.2 },
                          }}
                          whileTap={{ scale: 0.98 }}
                          className="group relative"
                        >
                          <div className="relative bg-white rounded-2xl p-5 border border-gray-100/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                            {/* Animated background gradient */}
                            <motion.div
                              className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                              style={{ background: nature.gradient }}
                            />

                            {/* Top decoration line */}
                            <motion.div
                              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${nature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                              initial={{ scaleX: 0 }}
                              whileHover={{ scaleX: 1 }}
                              transition={{ duration: 0.3 }}
                            />

                            <div className="relative z-10">
                              {/* Icon section */}
                              <div className="flex items-center justify-between mb-4">
                                <motion.div
                                  className={`p-3 rounded-xl ${nature.bgLight} group-hover:scale-110 transition-transform duration-300`}
                                  whileHover={{ rotate: [0, -10, 10, 0] }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <Icon
                                    className="w-5 h-5"
                                    style={{
                                      color:
                                        nature.gradient.match(
                                          /#[0-9A-F]{6}/,
                                        )?.[0] || "#000",
                                    }}
                                  />
                                </motion.div>
                                {count > 0 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="w-2 h-2 bg-green-400 rounded-full"
                                  />
                                )}
                              </div>

                              {/* Content */}
                              <div className="space-y-3">
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-gray-700 transition-colors">
                                    {nature.name}
                                  </h3>
                                </div>

                                <div className="flex items-baseline gap-2">
                                  <motion.span
                                    className="text-2xl font-bold text-gray-900"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.1 }}
                                  >
                                    {count}
                                  </motion.span>
                                  <span className="text-sm text-gray-500 font-medium">
                                    {percentage}%
                                  </span>
                                </div>

                                {/* Progress bar */}
                                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full bg-gradient-to-r ${nature.color} rounded-full relative`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{
                                      delay: 0.4 + index * 0.1,
                                      duration: 0.8,
                                      ease: "easeOut",
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Status Distribution - Interactive Line Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-600">
                      Status Trends (30 Days)
                    </h4>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-600">Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-600">In Progress</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-gray-600">Completed</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={generateStatusTrendData()}>
                      <defs>
                        <linearGradient
                          id="pendingGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#EAB308"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#EAB308"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="inProgressGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3B82F6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3B82F6"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="completedGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22C55E"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22C55E"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#374151", fontWeight: "bold" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stroke="#EAB308"
                        strokeWidth={2}
                        fill="url(#pendingGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="inProgress"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#inProgressGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="#22C55E"
                        strokeWidth={2}
                        fill="url(#completedGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-600">
                      Status Distribution
                    </h4>
                    <div className="text-xs text-gray-500">
                      Total:{" "}
                      {stats.pending + stats.inProgress + stats.completed}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={generateDistributionData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {generateDistributionData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(
                          value: number | undefined,
                          name: string | undefined,
                        ) => {
                          if (value === undefined || name === undefined)
                            return ["", ""];
                          const total =
                            stats.pending + stats.inProgress + stats.completed;
                          return [
                            `${value} (${Math.round((value / total) * 100)}%)`,
                            name,
                          ];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Custom Legend */}
                  <div className="flex justify-center gap-6 mt-4">
                    {generateDistributionData().map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                      >
                        <div
                          className="w-3 h-3 rounded-full group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-xs">
                          <div className="font-medium text-gray-700">
                            {item.name}
                          </div>
                          <div className="text-gray-500">
                            {item.value} (
                            {Math.round(
                              (item.value /
                                (stats.pending +
                                  stats.inProgress +
                                  stats.completed)) *
                                100,
                            )}
                            %)
                          </div>
                        </div>
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
                      {filteredRequests.map((request) => (
                        <RequestRow key={request.id} request={request} />
                      ))}
                    </tbody>
                  </table>
                  {filteredRequests.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>No requests found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Announcements Tab - Broadcast Only */}
        {activeTab === "announcements" && (
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

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-[#427A43] p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-header text-xl font-bold text-white">
                  Request Details
                </h2>
                <button
                  onClick={() => setShowDetailModal(null)}
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
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Nature
                </label>
                <p className="text-gray-900 mt-1">{showDetailModal.nature}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Location
                </label>
                <p className="text-gray-900 mt-1">{showDetailModal.location}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Urgency
                </label>
                <p className="text-gray-900 mt-1">{showDetailModal.urgency}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Status
                </label>
                <p className="text-gray-900 mt-1">{showDetailModal.status}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Description
                </label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {showDetailModal.description}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Requester
                </label>
                <p className="text-gray-900 mt-1">
                  {showDetailModal.profiles?.full_name || "Unknown"} (
                  {showDetailModal.profiles?.visual_role || "N/A"})
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Created
                </label>
                <p className="text-gray-900 mt-1">
                  {new Date(showDetailModal.created_at).toLocaleString()}
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setShowDetailModal(null)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
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
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={markAllNotificationsRead}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Mark all as read
              </button>
              <button
                onClick={deleteAllReadNotifications}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Delete all read
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification: any) => {
                  const isEmergency = notification.message
                    .toLowerCase()
                    .includes("emergency");
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all ${
                        !notification.is_read
                          ? isEmergency
                            ? "bg-red-50 border-red-200"
                            : "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                            !notification.is_read
                              ? isEmergency
                                ? "bg-red-500"
                                : "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          <p className="font-medium text-sm text-gray-900">
                            {notification.title}
                            {isEmergency && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-semibold">
                                EMERGENCY
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenNotificationMenu(
                                openNotificationMenu === notification.id
                                  ? null
                                  : notification.id,
                              );
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <svg
                              className="w-5 h-5 text-gray-500"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="6" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="18" r="2" />
                            </svg>
                          </button>
                          {openNotificationMenu === notification.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
          className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-500 ease-out ${showReportSidebar ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full overflow-y-auto">
            <div className="bg-[#427A43] shadow-lg border-b p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-header text-xl font-bold text-white">
                    Physical Plant/Facilities Form
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Generate official De La Salle John Bosco College form
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
                {/* Nature of Request Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-header text-sm font-semibold text-gray-900 mb-4">
                    NATURE OF REQUEST
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { key: "plumbing", label: "PLUMBING" },
                      { key: "carpentry", label: "CARPENTRY" },
                      { key: "electrical", label: "ELECTRICAL" },
                      { key: "personnelServices", label: "PERSONNEL SERVICES" },
                    ].map((option) => (
                      <label
                        key={option.key}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            reportFormData.natureOfRequest[
                              option.key as keyof typeof reportFormData.natureOfRequest
                            ]
                          }
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              natureOfRequest: {
                                ...prev.natureOfRequest,
                                [option.key]: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 text-[#427A43] border-gray-300 rounded focus:ring-[#427A43]"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                        URGENCY
                      </label>
                      <div className="space-y-2">
                        {["Very Urgent/Emergency", "Urgent", "Not Urgent"].map(
                          (option) => (
                            <label
                              key={option}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="urgency"
                                value={option}
                                checked={reportFormData.urgency === option}
                                onChange={(e) =>
                                  setReportFormData((prev) => ({
                                    ...prev,
                                    urgency: e.target.value,
                                  }))
                                }
                                className="w-4 h-4 text-[#427A43] border-gray-300 focus:ring-[#427A43]"
                              />
                              <span className="text-sm text-gray-700">
                                {option}
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          DATE
                        </label>
                        <input
                          type="date"
                          value={reportFormData.date}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          TIME
                        </label>
                        <input
                          type="time"
                          value={reportFormData.time}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              time: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Details Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-header text-sm font-semibold text-gray-900 mb-4">
                    REQUEST DETAILS
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        LOCATION
                      </label>
                      <input
                        type="text"
                        value={reportFormData.location}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            location: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        DESCRIPTION OF PROBLEM
                      </label>
                      <textarea
                        value={reportFormData.descriptionOfProblem}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            descriptionOfProblem: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="Describe the problem"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        WHAT WILL BE DONE
                      </label>
                      <textarea
                        value={reportFormData.whatWillBeDone}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            whatWillBeDone: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="Action to be taken"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        SUPPORTING REASON(S)
                      </label>
                      <textarea
                        value={reportFormData.supportingReasons}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            supportingReasons: e.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="Reasons for this request"
                      />
                    </div>
                  </div>
                </div>

                {/* Request/Approval Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-header text-sm font-semibold text-gray-900 mb-4">
                    REQUEST/APPROVAL SECTION
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        REQUESTED BY: (REQUESTING DEPARTMENT)
                      </label>
                      <input
                        type="text"
                        value={reportFormData.requestingDepartment}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            requestingDepartment: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm mb-2"
                        placeholder="Department name"
                      />
                      <input
                        type="text"
                        value={reportFormData.nameOfEmployee}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            nameOfEmployee: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm mb-2"
                        placeholder="Name of Employee"
                      />
                      <input
                        type="text"
                        value={reportFormData.departmentHead}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            departmentHead: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="Department Head"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        APPROVED BY: ADMINISTRATIVE AFFAIRS & SERVICES DIVISION
                      </label>
                      <input
                        type="text"
                        value={reportFormData.vpAASD}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            vpAASD: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="VP - AASD"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        RECEIVED BY:
                      </label>
                      <input
                        type="text"
                        value={reportFormData.gmsHead}
                        onChange={(e) =>
                          setReportFormData((prev) => ({
                            ...prev,
                            gmsHead: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm"
                        placeholder="GMS Head"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Evaluation Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-header text-sm font-semibold text-gray-900 mb-4">
                    WORK EVALUATION
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          DATE/TIME RECEIVED
                        </label>
                        <input
                          type="text"
                          value={reportFormData.dateTimeReceived}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              dateTimeReceived: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm bg-gray-100"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          PERFORMED BY
                        </label>
                        <input
                          type="text"
                          value={reportFormData.performedBy}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              performedBy: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm bg-gray-100"
                          readOnly
                          placeholder="Technician name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          DATE/TIME COMPLETED
                        </label>
                        <input
                          type="text"
                          value={reportFormData.dateTimeCompleted}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              dateTimeCompleted: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm bg-gray-100"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          ACKNOWLEDGE BY
                        </label>
                        <input
                          type="text"
                          value={reportFormData.acknowledgeBy}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              acknowledgeBy: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#427A43] focus:border-transparent text-sm bg-gray-100"
                          readOnly
                          placeholder="Acknowledged by"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                        WORK EVALUATION
                      </label>
                      <div className="space-y-2">
                        {[
                          {
                            value: "Outstanding",
                            description:
                              "Excellent Workmanship. Completed before the date needed/required.",
                          },
                          {
                            value: "Very Satisfactory",
                            description:
                              "Above Average Workmanship. Completed before the date needed/required.",
                          },
                          {
                            value: "Satisfactory",
                            description:
                              "Average/Acceptable Workmanship. Completed on the date needed.",
                          },
                          {
                            value: "Poor",
                            description:
                              "Messy/Unacceptable Workmanship. Very late.",
                          },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className="flex items-start space-x-2 opacity-75"
                          >
                            <input
                              type="radio"
                              name="workEvaluation"
                              value={option.value}
                              onChange={(e) =>
                                setReportFormData((prev) => ({
                                  ...prev,
                                  workEvaluation: e.target.value,
                                }))
                              }
                              className="w-4 h-4 text-[#427A43] border-gray-300 focus:ring-[#427A43] mt-0.5"
                              disabled
                            />
                            <div>
                              <span className="text-sm text-gray-700 font-medium">
                                {option.value}
                              </span>
                              <p className="text-xs text-gray-500">
                                {option.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
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
                    onClick={generatePDFReport}
                    className="flex-1 px-4 py-2.5 bg-[#427A43] text-white font-medium rounded-lg hover:bg-[#366337] transition-colors flex items-center justify-center gap-2"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Generate PDF Form
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
        className={`fixed top-0 left-0 h-screen w-96 bg-slate-900 shadow-2xl z-[60] transform transition-all duration-500 ease-out ${
          showAIChat ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Enhanced Header with Robot Icon */}
          <div className="bg-gradient-to-r from-[#427A43] to-emerald-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {/* Cool Robot Icon */}
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">AI Assistant</h2>
                <p className="text-white/80 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Neural Engine Ready
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Sample AI Message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-[#427A43]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-[#427A43]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 max-w-xs">
                  <p className="text-white text-sm">
                    Hello! I'm your AI maintenance assistant. I'm currently
                    getting ready to help you manage maintenance requests
                    efficiently.
                  </p>
                </div>
                <p className="text-slate-500 text-xs mt-1">AI • Coming soon</p>
              </div>
            </div>

            {/* Coming Soon Features */}
            <div className="bg-gradient-to-r from-[#427A43]/10 to-emerald-600/10 rounded-xl p-4 border border-[#427A43]/20">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-[#427A43]"
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
                <h3 className="text-white font-semibold">
                  Coming Soon Features
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#427A43] rounded-full"></div>
                  <p className="text-slate-300 text-sm">
                    Smart request prioritization
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#427A43] rounded-full"></div>
                  <p className="text-slate-300 text-sm">
                    Predictive maintenance insights
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#427A43] rounded-full"></div>
                  <p className="text-slate-300 text-sm">
                    Automated workflow optimization
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group">
                <svg
                  className="w-5 h-5 text-[#427A43] group-hover:text-emerald-400 mx-auto mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-white text-xs">Reports</p>
              </button>
              <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group">
                <svg
                  className="w-5 h-5 text-[#427A43] group-hover:text-emerald-400 mx-auto mb-1"
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
                <p className="text-white text-xs">Analytics</p>
              </button>
            </div>
          </div>

          {/* Enhanced Input Area */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2 mb-3">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Ask me anything about maintenance..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#427A43] focus:border-transparent"
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
            <div className="flex items-center justify-center mt-2">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>AI assistant is getting ready</span>
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
              </p>
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

      {/* Emergency Popup */}
      {emergencyPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEmergencyPopup(null)}
          />
          <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl shadow-2xl border-4 border-red-500 max-w-md w-full mx-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="animate-pulse">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-xl">🚨 EMERGENCY</h3>
            </div>
            <div className="bg-white/10 rounded-lg p-3 mb-3">
              <p className="text-center text-sm">{emergencyPopup.message}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setEmergencyPopup(null);
                  // Scroll to or highlight the emergency request in the list
                  const requestId = emergencyPopup.request_id;
                  if (requestId) {
                    const element = document.getElementById(
                      `request-${requestId}`,
                    );
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      element.classList.add("ring-4", "ring-red-500");
                      setTimeout(
                        () =>
                          element.classList.remove("ring-4", "ring-red-500"),
                        3000,
                      );
                    }
                  }
                }}
                className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow"
              >
                View
              </button>
              <button
                onClick={() => setEmergencyPopup(null)}
                className="px-4 py-2 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
