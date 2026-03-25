"use client";

// User Dashboard Client

import { useState, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFeatherPointed } from "@fortawesome/free-solid-svg-icons";

import { createClient } from "@/lib/supabase/client";

import { useTheme } from "@/contexts/ThemeContext";

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

  userAvatar?: string | null;
}

export default function UserDashboardClient({
  initialProfile,

  initialRequests,

  userId,

  userAvatar,
}: UserDashboardClientProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  const [requests, setRequests] =
    useState<MaintenanceRequest[]>(initialRequests);

  const [showForm, setShowForm] = useState(false);

  const [showProfileViewer, setShowProfileViewer] = useState(false);

  const [showProfileSidebar, setShowProfileSidebar] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");

  const [openNotificationMenu, setOpenNotificationMenu] = useState<
    string | null
  >(null);

  const [showConfirm, setShowConfirm] = useState(false);

  const [confirmType, setConfirmType] = useState<"admin" | "user" | null>(null);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const [showAllAnnouncementsModal, setShowAllAnnouncementsModal] =
    useState(false);

  const [showHelpModal, setShowHelpModal] = useState(false);

  const [activeHelpTab, setActiveHelpTab] = useState<"faq" | "about">("faq");

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());

  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  // Profile edit state
  const [profileFormData, setProfileFormData] = useState({
    full_name: profile?.full_name || "",
    visual_role: profile?.visual_role || "",
    theme_preference: (profile?.theme_preference || "light") as
      | "light"
      | "dark"
      | "system",
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Track original form data for unsaved changes detection
  const [originalFormData, setOriginalFormData] = useState({
    full_name: profile?.full_name || "",
    visual_role: profile?.visual_role || "",
    theme_preference: profile?.theme_preference || "light",
  });

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage("");
    try {
      const { updateProfile } = await import("@/app/profile-settings/actions");
      const result = await updateProfile({
        full_name: profileFormData.full_name,
        visual_role: profileFormData.visual_role,
        theme_preference: profileFormData.theme_preference,
      });

      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }

      setSuccessMessage("Profile updated successfully!");

      // Refresh the JWT session
      const supabase = createClient()!;
      await supabase.auth.refreshSession();

      // Refresh the page
      router.refresh();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Save error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setValidationErrors({
        ...validationErrors,
        avatar: "Please select an image file",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setValidationErrors({
        ...validationErrors,
        avatar: "Image must be less than 2MB",
      });
      return;
    }

    setUploadingAvatar(true);
    setValidationErrors({ ...validationErrors, avatar: "" });

    try {
      const fileName = `${profile.id}/avatar/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      await (supabase.from("profiles") as any)
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      setProfile({ ...profile, avatar_url: publicUrl });
      setAvatarPreview(null);
      router.refresh();
    } catch (error) {
      console.error("Avatar upload error:", error);
      setValidationErrors({
        ...validationErrors,
        avatar: "Failed to upload avatar",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Delete avatar handler
  const handleDeleteAvatar = async () => {
    if (!profile || !profile.avatar_url) return;

    const confirmed = window.confirm("Do you want to delete this picture?");
    if (!confirmed) return;

    try {
      // Extract file path from URL for storage deletion
      const urlParts = profile.avatar_url.split(
        "/storage/v1/object/public/avatars/",
      );
      if (urlParts.length > 1) {
        const fileName = urlParts[1];
        await supabase.storage.from("avatars").remove([fileName]);
      }

      // Update profile to remove avatar_url
      await (supabase.from("profiles") as any)
        .update({ avatar_url: null })
        .eq("id", profile.id);

      setProfile({ ...profile, avatar_url: null });
      setShowProfileViewer(false);
      router.refresh();
    } catch (error) {
      console.error("Delete avatar error:", error);
      setValidationErrors({
        ...validationErrors,
        avatar: "Failed to delete avatar",
      });
    }
  };

  // Password change handler
  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Data export handler
  const handleExportData = async () => {
    if (!profile) return;

    const exportData = {
      profile: {
        full_name: profile.full_name,
        visual_role: profile.visual_role,
        educational_level: profile.educational_level,
        department: profile.department,
        created_at: profile.created_at,
      },
      requests: requests.map((r) => ({
        id: r.id,
        nature: r.nature,
        urgency: r.urgency,
        location: r.location,
        description: r.description,
        status: r.status,
        created_at: r.created_at,
      })),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!profileFormData.full_name.trim()) {
      errors.full_name = "Full name is required";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check for unsaved changes
  const hasUnsavedChanges =
    JSON.stringify(profileFormData) !== JSON.stringify(originalFormData);

  const profileViewerRef = useRef<HTMLDivElement>(null);

  const notificationsRef = useRef<HTMLDivElement>(null);

  // Check if user is currently in admin mode

  const isAdmin = profile?.database_role === "admin";

  // Close profile viewer when clicking outside

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

  const [formData, setFormData] = useState({
    nature: "",

    urgency: "",

    location: "",

    description: "",

    supportingReason: "",

    photos: [] as string[],
  });

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success"
  >("idle");

  const supabase = createClient()!;

  const fetchRequests = async () => {
    const { data } = await supabase

      .from("maintenance_requests")

      .select("*")

      .eq("requester_id", userId)

      .order("created_at", { ascending: false });

    setRequests(data || []);
  };

  const fetchNotifications = async () => {
    // Fetch only user notifications from database

    const { data } = await (supabase.from("notifications") as any)

      .select("*")

      .eq("user_id", userId)

      .eq("target_role", "user")

      .order("created_at", { ascending: false })

      .limit(20);

    if (data) {
      setNotifications(data);

      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  // Fetch only announcements for the announcements modal
  const fetchAnnouncements = async () => {
    const { data } = await (supabase.from("notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("type", "announcement")
      .order("created_at", { ascending: false })
      .limit(50);

    return data || [];
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

      .eq("user_id", userId)

      .eq("target_role", "user")

      .eq("is_read", false);

    fetchNotifications();
  };

  const deleteNotification = async (notificationId: string) => {
    await (supabase.from("notifications") as any)

      .delete()

      .eq("id", notificationId);

    setOpenNotificationMenu(null);

    fetchNotifications();
  };

  const deleteAllReadNotifications = async () => {
    await (supabase.from("notifications") as any)

      .delete()

      .eq("user_id", userId)

      .eq("target_role", "user")

      .eq("is_read", true);

    fetchNotifications();
  };

  const togglePhotos = (e: React.MouseEvent, requestId: string) => {
    e.preventDefault();
    e.stopPropagation();
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

  const viewAnnouncement = (notification: any) => {
    setSelectedAnnouncement(notification);

    setShowAnnouncementModal(true);

    markNotificationRead(notification.id);
  };

  // Fetch notifications on mount and set up polling

  useEffect(() => {
    fetchNotifications();
    fetchAnnouncements().then(setAnnouncements);

    const notificationInterval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(notificationInterval);
  }, [userId]);

  // Poll for request updates

  useEffect(() => {
    const requestInterval = setInterval(fetchRequests, 15000);

    return () => clearInterval(requestInterval);
  }, [userId]);

  // Preserve scroll position on state updates
  const scrollPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = { x: window.scrollX, y: window.scrollY };
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (scrollPositionRef.current.y > 0) {
      window.scrollTo({
        top: scrollPositionRef.current.y,
        behavior: "instant",
      });
    }
  }, [requests]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitStatus("submitting");

    try {
      let photoUrls: string[] = [];

      // Upload photos if any

      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const fileName = `${userId}/${Date.now()}-${file.name}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage

              .from("maintenance-requests-photos")

              .upload(fileName, file);

          if (uploadError) {
            console.error("Photo upload error:", uploadError);

            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage

            .from("maintenance-requests-photos")

            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        }
      }

      const { error } = await (
        supabase.from("maintenance_requests") as any
      ).insert({
        requester_id: userId,

        nature: formData.nature,

        urgency: formData.urgency,

        location: formData.location,

        description: formData.description,

        photos: photoUrls,
      });

      if (error) {
        alert("Error submitting request");

        setSubmitStatus("idle");

        return;
      }

      // Get all admin user IDs to send notifications

      console.log("Fetching admins via RPC function...");

      // Use RPC function to bypass RLS and get all admin profiles
      const { data: admins, error: adminError } = await (supabase as any).rpc(
        "get_admin_profiles",
      );

      console.log("=== ADMIN QUERY RESULT ===");
      console.log("admins:", JSON.stringify(admins, null, 2));
      console.log("adminError:", adminError);
      console.log("admins.length:", admins?.length);

      if (!admins || admins.length === 0) {
        console.warn(
          "No admins found in database! Notifications will not be sent.",
        );
      } else if (admins && admins.length > 0) {
        // Use database function to create admin notifications (bypasses RLS)

        console.log("Creating notifications for", admins.length, "admins");

        const adminIds = admins as unknown as { id: string }[];

        // Get the new request ID for linking
        const { data: newRequest } = await (
          supabase.from("maintenance_requests") as any
        )
          .select("id")
          .eq("requester_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        for (const admin of adminIds) {
          const args = {
            p_user_id: admin.id,

            p_title:
              formData.urgency === "Emergency"
                ? "🚨 EMERGENCY Maintenance Request"
                : "New Maintenance Request",

            p_message:
              formData.urgency === "Emergency"
                ? `🚨 EMERGENCY: A new emergency request has been submitted: ${formData.nature}`
                : `New maintenance request: ${formData.nature} at ${formData.location}`,

            p_link_url: newRequest?.id
              ? `/admin/dashboard?request=${newRequest.id}`
              : "/admin/dashboard",

            p_target_role: "admin",
          };

          console.log("Creating notification for admin:", admin.id, args);

          const result = await (supabase as any).rpc(
            "create_admin_notification",

            args,
          );

          console.log("Notification result for", admin.id, ":", result);
        }
      }

      // Show success state

      setSubmitStatus("success");

      // Reset form and refresh requests

      setFormData({
        nature: "",

        urgency: "",

        location: "",

        description: "",

        supportingReason: "",

        photos: [],
      });

      setPhotoFiles([]);

      setShowForm(false);

      fetchRequests();

      // Reset status after delay

      setTimeout(() => {
        setSubmitStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error submitting request:", error);

      alert("Error submitting request");

      setSubmitStatus("idle");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      setPhotoFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleThemeToggle = async () => {
    if (!profile) return;

    const currentTheme = (profile.theme_preference || "light").toLowerCase();

    // Cycle only between light and dark
    const newTheme: ThemePreference =
      currentTheme === "light" ? "dark" : "light";

    // Update ThemeContext for immediate UI update
    toggleTheme();

    // Optimistically update local state first
    setProfile({ ...profile, theme_preference: newTheme as ThemePreference });

    // Then try to update database
    const { error } = await (supabase.from("profiles") as any)
      .update({ theme_preference: newTheme })
      .eq("id", profile.id);

    if (error) {
      console.error("Theme update error:", error);
      // Revert on error
      setProfile({
        ...profile,
        theme_preference: currentTheme as ThemePreference,
      });
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

  const handleClearRequest = async (requestId: string) => {
    const confirmed = confirm(
      "Are you sure you want to clear this request? It will be hidden from your view but preserved in the database.",
    );
    if (!confirmed) return;

    const { error } = await (supabase.from("maintenance_requests") as any)
      .update({ is_cleared_by_user: true })
      .eq("id", requestId);

    if (!error) {
      setRequests(requests.filter((r: any) => r.id !== requestId));
    }
  };

  const handleSignOut = async () => {
    // Check if user is a guest - show UI modal instead of browser confirm
    if (profile?.is_anonymous) {
      setShowSignOutConfirm(true);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleGuestSignOut = async () => {
    // Delete the guest profile before signing out
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    if (deleteError) {
      console.error("Error deleting guest profile:", deleteError);
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Profile settings mode switching functionality

  const handleModeSwitch = async (enableAdmin: boolean) => {
    setLoading(true);

    try {
      console.log("=== SWITCHING MODE ===");

      // Call the server action

      const response = await fetch("/api/switch-admin-mode", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ enableAdmin }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(`Error: ${result.error}`);

        setShowConfirm(false);

        return;
      }

      console.log("Mode switch successful, refreshing JWT session...");

      // Force the browser to fetch a fresh JWT

      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.warn("JWT refresh warning (non-fatal):", refreshError.message);
      } else {
        console.log("JWT refreshed successfully — new role active.");
      }

      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (error) {
      console.error("Mode switch error:", error);

      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);

      setShowConfirm(false);
    }
  };

  const handleAdminModeSwitch = () => {
    setConfirmType("user");

    setShowConfirm(true);
  };

  const handleUserModeSwitch = () => {
    setConfirmType("admin");

    setShowConfirm(true);
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#E6F4FF]" : "bg-[#F5F5DC]"}`}>
      {/* Enhanced Header */}

      <div
        className={`shadow-lg border-b transition-all duration-300 ${isDark ? "bg-[#16334C] border-[#16334C]" : "bg-green-600 border-green-700"}`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left Side - Logo and Dashboard text */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faFeatherPointed}
                  className="w-8 h-8 text-white"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-white font-bold text-xl">Dashboard</h1>
                <span className="text-white/70 text-xs hidden md:block">
                  Integrated Visual Feedback & Maintenance Utility
                </span>
              </div>
            </div>

            {/* Right Side - Profile and Hamburger */}
            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileViewer(!showProfileViewer)}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 transition-all duration-300 hover:scale-110 hover:bg-white/30 overflow-hidden"
                  title="Click to view profile picture"
                >
                  {profile?.avatar_url || userAvatar ? (
                    <img
                      src={profile?.avatar_url || userAvatar || ""}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load

                        e.currentTarget.style.display = "none";

                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                  ) : null}

                  <span
                    className={`text-white font-bold text-lg ${profile?.avatar_url || userAvatar ? "hidden" : ""}`}
                  >
                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </button>

                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse ${isDark ? "bg-green-400 border-[#16334C]" : "bg-green-400 border-white"}`}
                ></div>

                {/* Profile Picture Viewer - shows uploaded avatar or Google avatar */}

                {showProfileViewer && (profile?.avatar_url || userAvatar) && (
                  <div
                    className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ${showProfileViewer ? "opacity-100" : "opacity-0"}`}
                    onClick={() => setShowProfileViewer(false)}
                  >
                    <div
                      className={`relative transform transition-all duration-300 ${showProfileViewer ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
                      ref={profileViewerRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-72 h-72 rounded-full bg-white/20 backdrop-blur-xl shadow-2xl border-2 border-white/30 flex flex-col items-center justify-center p-8">
                        <div className="w-56 h-56 rounded-full overflow-hidden border-3 border-white/50 shadow-lg mb-4 bg-white">
                          <img
                            src={profile?.avatar_url || userAvatar || ""}
                            alt="Profile Picture"
                            className="w-full h-full object-contain"
                            style={{
                              imageRendering: "auto",
                              imageResolution: "from-image",
                            }}
                          />
                        </div>

                        <h3 className="font-header font-semibold text-white text-lg text-center">
                          {profile?.full_name}
                        </h3>

                        <p className="text-sm text-white/80 text-center">
                          {profile?.visual_role}
                        </p>
                      </div>

                      {/* Delete button */}
                      {profile?.avatar_url && (
                        <button
                          onClick={handleDeleteAvatar}
                          className="absolute bottom-0 right-0 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
                          title="Delete avatar"
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
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 transform hover:scale-105 text-white"
                title="Menu"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Sidebar */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${showHamburgerMenu ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => setShowHamburgerMenu(false)}
        />

        {/* Sidebar */}
        <div
          className={`fixed left-0 top-0 h-full w-64 ${isDark ? "bg-[#0F2233] border-[#3B85C6]/30" : "bg-gray-50 border-green-200"} z-50 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${showHamburgerMenu ? "translate-x-0" : "-translate-x-full"}`}
        >
          {/* Logo and Title */}
          <div
            className={`p-6 ${isDark ? "border-[#3B85C6]/30" : "border-green-100"} border-b`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faFeatherPointed}
                  className={`w-8 h-8 ${isDark ? "text-[#3B85C6]" : "text-green-600"}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className={`font-bold text-lg truncate ${isDark ? "text-[#E6F0F8]" : "text-green-800"}`}
                >
                  Menu
                </h1>
                <div
                  className={`text-xs truncate ${isDark ? "text-[#E6F0F8]/70" : "text-green-600/70"}`}
                >
                  <div>Integrated Visual Feedback</div>
                  <div>& Maintenance Utility</div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 py-4 px-3">
            <ul className="space-y-1">
              {/* Announcements */}
              <li>
                <button
                  onClick={() => {
                    setShowAllAnnouncementsModal(true);
                    setShowHamburgerMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                  <span className="font-medium">Announcements</span>
                </button>
              </li>

              {/* Help */}
              <li>
                <button
                  onClick={() => {
                    setShowHelpModal(true);
                    setShowHamburgerMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">Help</span>
                </button>
              </li>

              {/* Notifications */}
              <li>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowHamburgerMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </li>

              {/* Settings */}
              <li>
                <button
                  onClick={() => {
                    setShowProfileSidebar(true);
                    setShowHamburgerMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="font-medium">Settings</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Theme Toggle - Above Sign Out */}
          <div
            className={`px-4 py-3 border-t flex items-center justify-between ${isDark ? "border-[#3B85C6]/30" : "border-green-100"}`}
          >
            <div
              className={`flex items-center gap-2 ${isDark ? "text-[#3B85C6]" : "text-green-700"}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isDark ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                )}
              </svg>
              <span className="font-medium">Theme</span>
            </div>
            <label className="theme-toggle-switch cursor-pointer">
              <input
                type="checkbox"
                checked={isDark}
                onChange={handleThemeToggle}
                className="hidden"
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Sign Out - Bottom */}
          <div
            className={`p-4 border-t ${isDark ? "border-[#3B85C6]/30" : "border-green-100"}`}
          >
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium border shadow-sm hover:shadow-md ${
                isDark
                  ? "bg-[#0F2233] text-[#3B85C6] hover:text-red-400 border-[#3B85C6]/50"
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
      </>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-300">
          {/* New Request Form */}

          <div className="lg:col-span-1">
            <div
              className={`rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn ${isDark ? "bg-white" : "bg-white"}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-header text-lg font-semibold text-gray-900 transition-all duration-300">
                  New Request
                </h2>

                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className={`text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      isDark
                        ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    Create
                  </button>
                )}
              </div>

              {showForm ? (
                <form
                  onSubmit={handleSubmitRequest}
                  className="space-y-5 animate-fadeIn relative"
                >
                  {/* Loading/Success Overlay */}

                  {submitStatus === "submitting" && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>

                      <p className="text-gray-700 font-semibold text-lg">
                        Creating your request...
                      </p>

                      <p className="text-gray-500 text-sm mt-1">Please wait</p>
                    </div>
                  )}

                  {submitStatus === "success" && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                          className="w-8 h-8 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>

                      <p className="text-gray-700 font-semibold text-lg">
                        Request Submitted Successfully!
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        Redirecting...
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-600"
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
                      Nature of Issue *
                    </label>

                    <div className="relative">
                      <select
                        value={formData.nature}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nature: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-gray-300 appearance-none cursor-pointer text-gray-700 font-medium"
                        required
                      >
                        <option value="" className="text-gray-400">
                          Select the type of maintenance needed
                        </option>

                        <option value="Plumbing">Plumbing</option>

                        <option value="Electrical">Electrical</option>

                        <option value="Carpentry">Carpentry</option>

                        <option value="HVAC">HVAC</option>

                        <option value="Cleaning">Cleaning</option>

                        <option value="Masonry">Masonry</option>

                        <option value="Other">Other</option>
                      </select>

                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Urgency Level *
                    </label>

                    <div className="relative">
                      <select
                        value={formData.urgency}
                        onChange={(e) =>
                          setFormData({ ...formData, urgency: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-gray-300 appearance-none cursor-pointer text-gray-700 font-medium"
                        required
                      >
                        <option value="" className="text-gray-400">
                          How urgent is this issue?
                        </option>

                        <option value="Emergency">
                          Emergency - Immediate attention required
                        </option>

                        <option value="Urgent">Urgent - Within 24 hours</option>

                        <option value="Not Urgent">
                          Not Urgent - Routine maintenance
                        </option>
                      </select>

                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />

                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Location *
                    </label>

                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-gray-300 text-gray-700 font-medium placeholder-gray-400"
                      placeholder="e.g., Building A, Room 201, Main Office"
                      required
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-purple-600"
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
                      Detailed Description *
                    </label>

                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,

                          description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-gray-300 text-gray-700 font-medium placeholder-gray-400 resize-none"
                      rows={4}
                      placeholder="Please describe the issue in detail. Include any relevant information that might help resolve it quickly..."
                      required
                    />

                    <div className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/500 characters
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-orange-600"
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
                      Additional Context (Optional)
                    </label>

                    <textarea
                      value={formData.supportingReason}
                      onChange={(e) =>
                        setFormData({
                          ...formData,

                          supportingReason: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-gray-300 text-gray-700 font-medium placeholder-gray-400 resize-none"
                      rows={3}
                      placeholder="Any additional information, previous attempts to fix, or special considerations..."
                    />

                    <div className="text-xs text-gray-500 mt-1">
                      {formData.supportingReason.length}/300 characters
                    </div>
                  </div>

                  {/* Photo Upload Section */}

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 transition-all duration-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-pink-600"
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
                      Attach Photos (Optional)
                    </label>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-green-500 hover:bg-green-50/30 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                        disabled={photoFiles.length >= 5}
                      />

                      <label
                        htmlFor="photo-upload"
                        className={`flex flex-col items-center justify-center cursor-pointer py-2 ${photoFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <svg
                          className="w-8 h-8 text-gray-400 mb-2"
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

                        <span className="text-sm text-gray-500">
                          {photoFiles.length >= 5
                            ? "Maximum 5 photos reached"
                            : "Click to upload photos (max 5)"}
                        </span>
                      </label>
                    </div>

                    {/* Photo Preview */}

                    {photoFiles.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {photoFiles.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                            />

                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-600 hover:scale-110 transition-all shadow-md"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className={`flex-1 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 font-medium border-2 ${
                        isDark
                          ? "text-white bg-gray-700 hover:bg-gray-600 border-transparent"
                          : "text-gray-700 bg-gray-100 hover:bg-gray-200 border-transparent hover:border-gray-300"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cancel
                      </span>
                    </button>

                    <button
                      type="submit"
                      className={`flex-1 px-6 py-3 text-white rounded-xl transition-all duration-300 transform hover:scale-105 font-medium shadow-lg hover:shadow-xl ${
                        isDark
                          ? "bg-gradient-to-r from-[#3B85C6] to-blue-600 hover:from-[#3B85C6]/80 hover:to-blue-700"
                          : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Submit Request
                      </span>
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
            <div
              className={`rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-fadeIn ${isDark ? "bg-white" : "bg-white"}`}
            >
              <h2 className="font-header text-lg font-semibold text-gray-900 mb-4 transition-all duration-300">
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
                  {requests
                    .filter((r: any) => !r.is_cleared_by_user)
                    .map((request) => (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.01] hover:border-gray-300 animate-fadeIn"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-header font-medium text-gray-900 transition-all duration-300">
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

                        {/* Photo Display */}

                        {request.photos && request.photos.length > 0 && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={(e) => togglePhotos(e, request.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              {expandedPhotos.has(request.id) ? (
                                <>
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
                                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                    />
                                  </svg>
                                  Hide photos
                                </>
                              ) : (
                                <>
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
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  Show photos ({request.photos.length})
                                </>
                              )}
                            </button>
                            {expandedPhotos.has(request.id) && (
                              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {request.photos.map((photo, index) => (
                                  <img
                                    key={index}
                                    src={photo}
                                    alt={`Attachment ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                                    onClick={() => setSelectedPhoto(photo)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs text-gray-500 transition-all duration-300">
                          <span>Urgency: {request.urgency}</span>

                          <div className="flex items-center gap-2">
                            <span suppressHydrationWarning>
                              {new Date(
                                request.created_at,
                              ).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleClearRequest(request.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Clear request"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Sidebar */}

      <div
        ref={notificationsRef}
        className={`fixed top-0 right-0 h-full w-64 ${isDark ? "bg-[#0F2233] border-[#3B85C6]/30" : "bg-gray-50 border-green-200"} shadow-xl z-40 transform transition-transform duration-500 ease-out flex flex-col ${
          showNotifications ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Logo and Title - Like menu sidebar */}
        <div
          className={`p-6 ${isDark ? "border-[#3B85C6]/30" : "border-green-100"} border-b`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
              <svg
                className={`w-8 h-8 ${isDark ? "text-[#3B85C6]" : "text-green-600"}`}
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
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className={`font-bold text-lg truncate ${isDark ? "text-[#E6F0F8]" : "text-green-800"}`}
              >
                Notifications
              </h1>
              <div
                className={`text-xs truncate ${isDark ? "text-white" : "text-green-600/70"}`}
              >
                <div>Stay updated with your</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Action Buttons */}
          <div
            className={`flex justify-between items-center mb-4 pb-3 border-b ${isDark ? "border-[#3B85C6]/30" : "border-green-100"}`}
          >
            <button
              onClick={markAllNotificationsRead}
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? "text-[#3B85C6] hover:text-[#3B85C6]/80"
                  : "text-green-600 hover:text-green-700"
              }`}
            >
              Mark all as read
            </button>

            <button
              onClick={deleteAllReadNotifications}
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Delete all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div
              className={`p-4 text-center ${isDark ? "text-white/60" : "text-gray-500"}`}
            >
              No notifications yet
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    !notification.is_read
                      ? isDark
                        ? "bg-[#0F2233] border-[#3B85C6]/30 shadow-sm hover:shadow-md hover:border-[#3B85C6]/50"
                        : "bg-white border-green-200 shadow-sm hover:shadow-md hover:border-green-300"
                      : isDark
                        ? "bg-[#1A3A54] border-[#3B85C6]/30 hover:bg-[#0F2233] hover:shadow-sm hover:border-[#3B85C6]/30"
                        : "bg-gray-50 border-gray-200 hover:bg-white hover:shadow-sm hover:border-green-200"
                  }`}
                  onClick={() => viewAnnouncement(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        !notification.is_read
                          ? isDark
                            ? "bg-[#3B85C6]"
                            : "bg-green-500"
                          : isDark
                            ? "bg-gray-600"
                            : "bg-gray-300"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={`text-xs ${isDark ? "text-white/60" : "text-gray-500"}`}
                      >
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
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="6" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="18" r="2" />
                        </svg>
                      </button>

                      {openNotificationMenu === notification.id && (
                        <div
                          className={`absolute right-0 mt-1 w-32 rounded-lg shadow-lg z-10 ${
                            isDark
                              ? "bg-[#0F2233] border border-[#3B85C6]/30"
                              : "bg-white border border-green-200"
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                              isDark
                                ? "text-red-400 hover:bg-red-900/30"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button - Like sign out in other sidebars */}
        <div
          className={`p-4 border-t ${isDark ? "border-[#3B85C6]/30" : "border-green-100"}`}
        >
          <button
            onClick={() => setShowNotifications(false)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium border shadow-sm hover:shadow-md ${
              isDark
                ? "bg-[#0F2233] text-[#3B85C6] hover:text-red-400 border-[#3B85C6]/50"
                : "bg-white hover:bg-green-50 text-green-700 border-green-200"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </button>
        </div>
      </div>

      {/* Profile Settings Sidebar */}

      <>
        {/* Backdrop */}

        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-500 ${
            showProfileSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setShowProfileSidebar(false)}
        />

        {/* Sidebar */}

        <div
          className={`fixed top-0 left-0 h-full w-64 ${isDark ? "bg-[#0F2233] border-[#3B85C6]/30" : "bg-gray-50 border-green-200"} shadow-xl z-50 transform transition-transform duration-500 ease-out flex flex-col ${
            showProfileSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Profile Header - Like menu sidebar logo section */}
          <div
            className={`p-6 ${isDark ? "border-[#3B85C6]/30" : "border-green-100"} border-b`}
          >
            <div className="flex flex-col items-center">
              {/* Profile Photo */}
              <div className="relative mb-4">
                <div
                  className={`w-20 h-20 rounded-full bg-gray-200 border-4 shadow-lg overflow-hidden flex items-center justify-center ${isDark ? "border-[#3B85C6]/30" : "border-white"}`}
                >
                  {profile?.avatar_url || userAvatar ? (
                    <img
                      src={
                        avatarPreview || profile?.avatar_url || userAvatar || ""
                      }
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer hover:scale-110 transition-all shadow-md ${
                    isDark
                      ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                      : "bg-[#5D9C59] hover:bg-[#4a7c4a]"
                  } text-white`}
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <input
                    id="avatar-upload-sidebar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              {/* Full Name - 2 lines max */}
              <h2
                className={`font-bold text-lg text-center line-clamp-2 ${isDark ? "text-white" : "text-green-800"}`}
              >
                {profile?.full_name || "User"}
              </h2>

              {/* Visual Role Badge */}
              <span
                className={`backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                  isDark
                    ? "bg-[#3B85C6]/20 text-[#3B85C6]"
                    : "bg-white/20 text-green-700"
                }`}
              >
                {profile?.visual_role || "User"}
              </span>

              {/* Access Mode Badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold text-white mt-2 ${isAdmin ? "bg-red-500" : isDark ? "bg-[#3B85C6]" : "bg-green-500"}`}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </span>
            </div>
          </div>

          {/* Navigation-style Sections */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <ul className="space-y-1">
              {/* Full Name Section */}
              <li>
                <button
                  onClick={() =>
                    document.getElementById("profile-fullname")?.focus()
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <div className="flex-1 text-left">
                    <span className="font-medium">Full Name</span>
                    <input
                      id="profile-fullname"
                      type="text"
                      value={profileFormData.full_name}
                      onChange={(e) =>
                        setProfileFormData({
                          ...profileFormData,
                          full_name: e.target.value,
                        })
                      }
                      className={`w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-[#5D9C59] focus:border-transparent ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    />
                  </div>
                </button>
              </li>

              {/* Visual Role Section */}
              <li>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex-1 text-left">
                    <span className="font-medium">Visual Role</span>
                    <select
                      value={profileFormData.visual_role}
                      onChange={(e) =>
                        setProfileFormData({
                          ...profileFormData,
                          visual_role: e.target.value,
                        })
                      }
                      className={`w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-[#5D9C59] focus:border-transparent ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <option value="">Select a role</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Staff">Staff</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                </button>
              </li>

              {/* Theme Preference Section - Display Only */}
              <li>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
                  }`}
                >
                  {isDark ? (
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
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                  <div className="flex-1 text-left">
                    <span className="font-medium">Theme</span>
                    <p
                      className={`text-sm capitalize ${isDark ? "text-white/60" : "text-gray-500"}`}
                    >
                      {profile?.theme_preference || "light"}
                    </p>
                  </div>
                </button>
              </li>

              {/* Educational Level - Display Only */}
              {!isAdmin && profile?.educational_level && (
                <li>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                        : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                        d="M12 14l9-5-9-5-9 5 9 5z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 14l9-5-9-5-9 5 9 5z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                      />
                    </svg>
                    <span className="font-medium">
                      {profile?.educational_level || "Not set"}
                    </span>
                  </button>
                </li>
              )}

              {/* Department - Display Only */}
              {!isAdmin && profile?.department && (
                <li>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                        : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <div className="flex-1 text-left">
                      <span className="font-medium">Department</span>
                      <p className="text-sm text-gray-600">
                        {profile.department}
                      </p>
                    </div>
                  </button>
                </li>
              )}

              {/* Export Data */}
              <li>
                <button
                  onClick={handleExportData}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-[#E6F0F8] hover:bg-[#1A3A54] hover:shadow-sm hover:text-[#E6F0F8]"
                      : "text-green-700 hover:bg-white hover:shadow-sm hover:text-green-800"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="font-medium">Export Data</span>
                </button>
              </li>

              {/* Switch to Admin Mode - Admin in User Mode */}
              {isAdmin && profile?.database_role === "user" && (
                <li>
                  <button
                    onClick={handleAdminModeSwitch}
                    disabled={loading}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "bg-[#3B85C6]/10 text-[#3B85C6] hover:bg-[#3B85C6]/20"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="font-medium">
                      {loading ? "Switching..." : "Switch to Admin Mode"}
                    </span>
                  </button>
                </li>
              )}

              {/* Mode Switching - Regular User */}
              {!isAdmin && profile?.database_role === "user" && (
                <li>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-default ${
                      isDark
                        ? "bg-[#3B85C6]/10 text-[#3B85C6]"
                        : "bg-green-50 text-green-700"
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">User Mode Active</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Bottom Section - Save Button */}
          <div
            className={`p-4 border-t space-y-3 ${isDark ? "border-[#3B85C6]/30" : "border-green-100"}`}
          >
            {/* Success Message */}
            {successMessage && (
              <div
                className={`p-3 rounded-lg text-sm text-center ${
                  isDark
                    ? "bg-[#3B85C6]/10 border border-[#3B85C6]/30 text-[#3B85C6]"
                    : "bg-green-50 border border-green-200 text-green-700"
                }`}
              >
                {successMessage}
              </div>
            )}

            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div
                className={`p-2 border rounded-lg text-xs text-center ${
                  isDark
                    ? "bg-amber-900/20 border-amber-700 text-amber-400"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                Unsaved changes
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-lg disabled:bg-gray-400 transition-colors ${
                isDark
                  ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                  : "bg-[#5D9C59] hover:bg-[#4a7c4a]"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Changes
                </>
              )}
            </button>

            {/* Account Info */}
            <div
              className="text-center text-xs text-gray-500"
              suppressHydrationWarning
            >
              Account created:{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : ""}
            </div>
          </div>
        </div>
      </>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-xl shadow-xl p-8 max-w-md w-full ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <h4
              className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Confirm Mode Switch
            </h4>

            {confirmType === "user" && (
              <>
                <p
                  className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                ></p>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg disabled:bg-gray-200 transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>

              <button
                onClick={() => handleModeSwitch(confirmType === "admin")}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:bg-gray-400 transition-colors ${
                  isDark
                    ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {loading ? "Switching..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-xl shadow-xl p-8 max-w-md w-full ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-full ${isDark ? "bg-red-900/30" : "bg-red-100"}`}
              >
                <svg
                  className={`w-6 h-6 ${isDark ? "text-red-400" : "text-red-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h4
                className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Sign Out
              </h4>
            </div>

            <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Are you sure you want to sign out?
            </p>

            <div
              className={`p-4 rounded-lg mb-6 ${isDark ? "bg-yellow-900/20 border border-yellow-700/50" : "bg-yellow-50 border border-yellow-200"}`}
            >
              <p
                className={`text-sm ${isDark ? "text-yellow-300" : "text-yellow-800"}`}
              >
                Once signed out, you'll lose access to your temporary account
                and your profile will be deleted.
              </p>
              <p
                className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Note: Your maintenance requests will be preserved but will no
                longer be associated with an account.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>

              <button
                onClick={handleGuestSignOut}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  isDark
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Announcement Modal */}

      {showAnnouncementModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-md bg-white`}>
            <div
              className={`p-6 border-b ${isDark ? "border-[#3B85C6]/30" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <h3
                  className={`font-header text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {selectedAnnouncement.title}
                </h3>

                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className={
                    isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }
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
              <p
                className={`whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                {selectedAnnouncement.message}
              </p>

              <p
                className={`text-xs mt-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                {new Date(selectedAnnouncement.created_at).toLocaleString()}
              </p>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                    isDark
                      ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                      : "bg-[#5D9C59] hover:bg-[#4a7c4a]"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* All Announcements Modal */}
      {showAllAnnouncementsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white`}
          >
            <div
              className={`p-6 border-b flex items-center justify-between ${isDark ? "border-[#3B85C6]/30" : "border-gray-200"}`}
            >
              <h3
                className={`font-header text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                All Announcements
              </h3>
              <button
                onClick={() => setShowAllAnnouncementsModal(false)}
                className={
                  isDark
                    ? "text-white/60 hover:text-white"
                    : "text-gray-400 hover:text-gray-600"
                }
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
            <div className="flex-1 overflow-y-auto p-6">
              {announcements.length === 0 ? (
                <p
                  className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  No announcements yet
                </p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        setSelectedAnnouncement(notification);
                        setShowAnnouncementModal(true);
                      }}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        isDark
                          ? "border border-gray-700 hover:bg-gray-700"
                          : "border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4
                            className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                          >
                            {notification.title}
                          </h4>
                          <p
                            className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${isDark ? "bg-[#3B85C6]" : "bg-green-500"}`}
                          ></span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div
              className={`p-4 border-t ${isDark ? "border-[#3B85C6]/30" : "border-gray-200"}`}
            >
              <button
                onClick={() => setShowAllAnnouncementsModal(false)}
                className={`w-full px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  isDark
                    ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                    : "bg-[#5D9C59] hover:bg-[#4a7c4a]"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal with FAQ and About tabs */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <div
              className={`p-6 border-b flex items-center justify-between ${isDark ? "border-gray-700" : "border-gray-200"}`}
            >
              <h3
                className={`font-header text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Help & About
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className={
                  isDark
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-400 hover:text-gray-600"
                }
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
            <div
              className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
            >
              <div className="flex">
                <button
                  onClick={() => setActiveHelpTab("faq")}
                  className={`flex-1 px-6 py-3 font-medium transition-colors ${
                    activeHelpTab === "faq"
                      ? isDark
                        ? "text-[#3B85C6] border-b-2 border-[#3B85C6]"
                        : "text-[#5D9C59] border-b-2 border-[#5D9C59]"
                      : isDark
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  FAQ
                </button>
                <button
                  onClick={() => setActiveHelpTab("about")}
                  className={`flex-1 px-6 py-3 font-medium transition-colors ${
                    activeHelpTab === "about"
                      ? isDark
                        ? "text-[#3B85C6] border-b-2 border-[#3B85C6]"
                        : "text-[#5D9C59] border-b-2 border-[#5D9C59]"
                      : isDark
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  About
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {activeHelpTab === "faq" ? (
                <div className="space-y-4">
                  <div
                    className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-4 py-3 font-medium ${isDark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}
                    >
                      How do I submit a maintenance request?
                    </div>
                    <div
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Click the "Create" button in the New Request section, fill
                      in the required details, and submit. You'll receive a
                      confirmation once submitted.
                    </div>
                  </div>
                  <div
                    className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-4 py-3 font-medium ${isDark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}
                    >
                      How can I track my request status?
                    </div>
                    <div
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Your requests are displayed in the "My Requests" section.
                      Each request shows its current status (Pending, In
                      Progress, Completed, etc.).
                    </div>
                  </div>
                  <div
                    className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-4 py-3 font-medium ${isDark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}
                    >
                      Can I edit or cancel my request?
                    </div>
                    <div
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Once submitted, requests cannot be edited. Please contact
                      the admin team if you need to cancel or modify your
                      request.
                    </div>
                  </div>
                  <div
                    className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-4 py-3 font-medium ${isDark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}
                    >
                      How do I upload photos with my request?
                    </div>
                    <div
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      When creating a request, use the photo upload section to
                      add up to 4 images showing the issue. This helps our team
                      understand the problem better.
                    </div>
                  </div>
                  <div
                    className={`border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div
                      className={`px-4 py-3 font-medium ${isDark ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}
                    >
                      What if I forget my password?
                    </div>
                    <div
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Use the "Forgot Password" link on the login page to reset
                      your password via email.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-700" : "bg-green-100"}`}
                    >
                      <svg
                        className={`w-10 h-10 ${isDark ? "text-[#3B85C6]" : "text-green-600"}`}
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
                    </div>
                    <h4
                      className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      IVFMU
                    </h4>
                    <p
                      className={`mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Integrated Visual Feedback & Maintenance Utility
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-4 ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <h5
                      className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      Version
                    </h5>
                    <p
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      1.0.0
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-4 ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <h5
                      className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      Purpose
                    </h5>
                    <p
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      IVFMU is a comprehensive maintenance request management
                      system designed to streamline the process of reporting and
                      resolving facility issues. It allows users to easily
                      submit maintenance requests, track their status, and
                      receive notifications.
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-4 ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <h5
                      className={`font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      Features
                    </h5>
                    <ul
                      className={`text-sm space-y-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      <li>• Submit maintenance requests with photos</li>
                      <li>• Track request status in real-time</li>
                      <li>• Receive notifications and announcements</li>
                      <li>• User-friendly dashboard interface</li>
                      <li>• Dark/Light theme support</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div
              className={`p-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}
            >
              <button
                onClick={() => setShowHelpModal(false)}
                className={`w-full px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  isDark
                    ? "bg-[#3B85C6] hover:bg-[#3B85C6]/80"
                    : "bg-[#5D9C59] hover:bg-[#4a7c4a]"
                }`}
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
