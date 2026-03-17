"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-64 min-h-screen bg-white border-r border-green-200 flex flex-col fixed left-0 top-0 shadow-sm">
      {/* Logo and Title */}
      <div className="p-6 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image
              src="/admin-logo.svg"
              alt="Admin Logo"
              width={48}
              height={48}
              className="w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-green-800 font-bold text-lg truncate">
              Dashboard
            </h1>
            <div className="text-green-600/70 text-xs truncate">
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
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-green-500 text-white shadow-md"
                    : "text-green-700 hover:bg-green-50 hover:text-green-800"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-green-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 font-medium"
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
