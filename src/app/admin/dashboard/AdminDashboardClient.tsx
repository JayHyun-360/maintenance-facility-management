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
  Bot,
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

// Safe date formatting component that only renders on client
function SafeDate({
  date,
  options,
}: {
  date: string | Date | undefined;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span suppressHydrationWarning>Loading...</span>;
  }

  const dateObj = date ? new Date(date) : null;

  if (!dateObj || isNaN(dateObj.getTime())) {
    return <span>N/A</span>;
  }

  return (
    <span suppressHydrationWarning>
      {dateObj.toLocaleDateString(undefined, options)}
    </span>
  );
}

// Interface for request with profile
interface RequestWithProfile extends MaintenanceRequest {
  profiles: Profile | null;
  requester_name?: string;
}

// Main Admin Dashboard Client Component
export default function AdminDashboardClient({
  initialRequests,
  initialStats,
  initialProfile,
  userAvatar,
  userId,
  initialRequestId,
}: {
  initialRequests: RequestWithProfile[];
  initialStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  initialProfile: Profile | null;
  userAvatar: string | null;
  userId: string;
  initialRequestId?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  // State management
  const [requests, setRequests] =
    useState<RequestWithProfile[]>(initialRequests);
  const [stats, setStats] = useState(initialStats);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "master-queue" | "announcements"
  >("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs
  const profileViewerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Generate chart data for status trends over time
  const generateStatusTrendData = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return dateRange.map((date) => {
      const dateStr = format(date, "MMM dd");
      const dayRequests = requests.filter(
        (r) => new Date(r.created_at).toDateString() === date.toDateString(),
      );

      return {
        date: dateStr,
        Pending: dayRequests.filter((r) => r.status === "Pending").length,
        "In Progress": dayRequests.filter((r) => r.status === "In Progress")
          .length,
        Completed: dayRequests.filter((r) => r.status === "Completed").length,
      };
    });
  };

  // Theme toggle handler
  const handleThemeToggle = async () => {
    if (!profile) return;

    const newTheme =
      profile.theme_preference === "light"
        ? "dark"
        : profile.theme_preference === "dark"
          ? "system"
          : "light";

    const updates: Record<string, string> = { theme_preference: newTheme };
    const { error } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, theme_preference: newTheme });
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (data) {
        setNotifications(data);
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Effects
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileViewerRef.current &&
        !profileViewerRef.current.contains(event.target as Node)
      ) {
        setShowProfileViewer(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex">
      {/* Vertical Sidebar */}
      <div className="w-64 bg-[#3D6B35] shadow-xl fixed h-full z-40">
        <div className="p-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/70 overflow-hidden">
              <img
                src="/admin-logo.svg"
                alt="Maintenance Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-header text-lg font-bold text-white">
                IVF Maintenance
              </h1>
              <p className="text-white/70 text-xs">Utility</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
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
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Top Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search requests, users, announcements..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B35] focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
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
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={handleThemeToggle}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 text-gray-600"
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

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 text-gray-600 relative"
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

              {/* AI Assistant */}
              <button
                onClick={() => setShowAIChat(!showAIChat)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 text-gray-600 relative"
                title="AI Assistant"
              >
                <Bot className="w-5 h-5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowProfileSidebar(true)}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg font-medium transition-all duration-300 text-sm text-gray-700"
              >
                Settings
              </button>

              {/* Profile Avatar */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileViewer(!showProfileViewer)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200 transition-all duration-300 hover:scale-110 overflow-hidden"
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
                    className={`text-gray-600 font-bold ${userAvatar ? "hidden" : ""}`}
                  >
                    {profile?.full_name?.charAt(0).toUpperCase() || "A"}
                  </span>
                </button>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg font-medium transition-all duration-300 text-sm text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Content with Bento Grid */}
        <div className="p-6">
          <div className="transition-opacity duration-300 ease-in-out">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* KPI Cards - Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                      <div className="w-12 h-12 bg-[#3D6B35]/10 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-[#3D6B35]"
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

                {/* Bento Grid - Middle Row with Requests by Nature */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Large Requests by Nature Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="lg:col-span-2 bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl shadow-lg border border-gray-100/50 p-8 backdrop-blur-sm relative overflow-hidden"
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
                              All maintenance request categories
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
                            count: requests.filter(
                              (r) => r.nature === nature.name,
                            ).length,
                          }))
                          .sort((a, b) => b.count - a.count)
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

                                      <motion.div
                                        className="text-right"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                          delay: 0.2 + index * 0.1,
                                        }}
                                      >
                                        <p className="text-2xl font-bold text-gray-900">
                                          {count}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                          {percentage}%
                                        </p>
                                      </motion.div>
                                    </div>

                                    {/* Name and progress bar */}
                                    <div>
                                      <h3 className="font-semibold text-gray-900 mb-2">
                                        {nature.name}
                                      </h3>

                                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <motion.div
                                          className={`h-full bg-gradient-to-r ${nature.color} rounded-full`}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${percentage}%` }}
                                          transition={{
                                            delay: 0.3 + index * 0.1,
                                            duration: 0.8,
                                            ease: "easeOut",
                                          }}
                                        />
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
                </div>

                {/* Bento Grid - Bottom Row with Status Trends and Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Status Trends Card */}
                  <div className="bg-white rounded-lg p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-600">
                        Status Trends (30 Days)
                      </h4>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-gray-500">Pending</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-500">In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-500">Completed</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={generateStatusTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#888"
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="Pending"
                          stroke="#eab308"
                          strokeWidth={2}
                          dot={{ fill: "#eab308", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="In Progress"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Completed"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ fill: "#22c55e", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status Distribution Card */}
                  <div className="bg-white rounded-lg p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-600">
                        Status Distribution
                      </h4>
                      <div className="text-xs text-gray-500">
                        Total: {stats.total}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Pending",
                              value: stats.pending,
                              color: "#eab308",
                            },
                            {
                              name: "In Progress",
                              value: stats.inProgress,
                              color: "#3b82f6",
                            },
                            {
                              name: "Completed",
                              value: stats.completed,
                              color: "#22c55e",
                            },
                          ].filter((item) => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: "Pending", color: "#eab308" },
                            { name: "In Progress", color: "#3b82f6" },
                            { name: "Completed", color: "#22c55e" },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {[
                        {
                          name: "Pending",
                          value: stats.pending,
                          color: "bg-yellow-500",
                          percentage:
                            stats.total > 0
                              ? Math.round((stats.pending / stats.total) * 100)
                              : 0,
                        },
                        {
                          name: "In Progress",
                          value: stats.inProgress,
                          color: "bg-blue-500",
                          percentage:
                            stats.total > 0
                              ? Math.round(
                                  (stats.inProgress / stats.total) * 100,
                                )
                              : 0,
                        },
                        {
                          name: "Completed",
                          value: stats.completed,
                          color: "bg-green-500",
                          percentage:
                            stats.total > 0
                              ? Math.round(
                                  (stats.completed / stats.total) * 100,
                                )
                              : 0,
                        },
                      ]
                        .filter((item) => item.value > 0)
                        .map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 ${item.color} rounded-full`}
                              ></div>
                              <span className="text-gray-600">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.value}
                              </span>
                              <span className="text-gray-500">
                                ({item.percentage}%)
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Analytics Dashboard
                  </h2>
                  <p className="text-gray-600">
                    Detailed analytics and reporting features coming soon.
                  </p>
                </div>
              </div>
            )}

            {/* Master Queue Tab */}
            {activeTab === "master-queue" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Master Queue
                  </h2>
                  <p className="text-gray-600">
                    Comprehensive queue management features coming soon.
                  </p>
                </div>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === "announcements" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Announcements
                  </h2>
                  <p className="text-gray-600">
                    Announcement management features coming soon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="text-sm text-gray-900">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No notifications
                </p>
              )}
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setShowNotifications(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                AI chat functionality coming soon...
              </p>
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setShowAIChat(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Sidebar */}
      {showProfileSidebar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Profile Settings
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Profile settings functionality coming soon...
              </p>
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setShowProfileSidebar(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
