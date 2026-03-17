"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThLarge,
  faChartBar,
  faList,
  faUsers,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";

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
    icon: <FontAwesomeIcon icon={faThLarge} className="w-5 h-5" />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <FontAwesomeIcon icon={faChartBar} className="w-5 h-5" />,
  },
  {
    id: "master-queue",
    label: "Master Queue",
    icon: <FontAwesomeIcon icon={faList} className="w-5 h-5" />,
  },
  {
    id: "announcements",
    label: "Announcements",
    icon: <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />,
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
    <div className="w-64 min-h-screen bg-gray-50 border-r border-green-200 flex flex-col fixed left-0 top-0 shadow-sm">
      {/* Logo and Title */}
      <div className="p-6 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faThLarge}
              className="w-8 h-8 text-green-600"
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

      {/* Sign Out */}
      <div className="p-4 border-t border-green-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-green-50 text-green-700 rounded-lg transition-all duration-200 font-medium border border-green-200 shadow-sm hover:shadow-md"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
