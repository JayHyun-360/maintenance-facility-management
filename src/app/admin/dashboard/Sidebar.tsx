"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFeatherPointed } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: {
    full_name?: string | null;
    visual_role?: string | null;
  } | null;
  userAvatar?: string | null;
}

const navItems = [
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
];

export default function Sidebar({
  activeTab,
  onTabChange,
  profile,
  userAvatar,
}: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`w-64 min-h-screen ${isDark ? "bg-[#1E1E1E] border-[#1E90FF]/30" : "bg-gray-50 border-green-200"} border-r flex flex-col fixed left-0 top-0 shadow-sm`}
    >
      {/* Logo and Title */}
      <div
        className={`p-6 ${isDark ? "border-[#1E90FF]/30" : "border-green-100"} border-b`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faFeatherPointed}
              className={`w-8 h-8 ${isDark ? "text-[#1E90FF]" : "text-green-600"}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className={`font-bold text-lg truncate ${isDark ? "text-[#1E90FF]" : "text-green-800"}`}
            >
              Dashboard
            </h1>
            <div
              className={`text-xs truncate ${isDark ? "text-white" : "text-green-600/70"}`}
            >
              <div>Integrated Visual Feedback</div>
              <div>& Maintenance Utility</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                id={`tutorial-nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? isDark
                      ? "bg-[#1E90FF] text-white shadow-md"
                      : "bg-green-500 text-white shadow-md"
                    : isDark
                      ? "text-[#1E90FF] hover:bg-gray-800 hover:shadow-sm hover:text-[#1E90FF]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div
        id="tutorial-sidebar-theme"
        className={`px-4 py-3 flex items-center justify-between ${isDark ? "border-[#1E90FF]/30" : "border-green-100"} border-t`}
      >
        <div
          className={`flex items-center gap-2 ${isDark ? "text-[#1E90FF]" : "text-green-700"}`}
        >
          {isDark ? (
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
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
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
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
          <span className="text-sm font-medium">Theme</span>
        </div>
        <label className="theme-toggle-switch cursor-pointer">
          <input
            type="checkbox"
            className="hidden"
            checked={isDark}
            onChange={toggleTheme}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {/* Sign Out */}
      <div
        className={`p-4 ${isDark ? "border-[#1E90FF]/30" : "border-green-100"} border-t`}
      >
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium border shadow-sm hover:shadow-md ${
            isDark
              ? "bg-gray-800 text-[#1E90FF] hover:text-red-400 border-[#1E90FF]/50"
              : "bg-white text-green-700 hover:text-red-600 border-green-200"
          }`}
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
          Sign Out
        </button>
      </div>
    </div>
  );
}
