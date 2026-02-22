// ==========================================
// Database Types - Original Schema Implementation
// Generated for Maintenance Facility Management
// ==========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          database_role: "admin" | "user";
          visual_role: "Teacher" | "Staff" | "Student" | null;
          educational_level: string | null;
          department: string | null;
          is_anonymous: boolean;
          theme_preference: "light" | "dark" | "system";
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          database_role?: "admin" | "user";
          visual_role?: "Teacher" | "Staff" | "Student" | null;
          educational_level?: string | null;
          department?: string | null;
          is_anonymous?: boolean;
          theme_preference?: "light" | "dark" | "system";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          database_role?: "admin" | "user" | null;
          visual_role?: "Teacher" | "Staff" | "Student" | null;
          educational_level?: string | null;
          department?: string | null;
          is_anonymous?: boolean | null;
          theme_preference?: "light" | "dark" | "system" | null;
          created_at?: string | null;
        };
      };
      maintenance_requests: {
        Row: {
          id: string;
          requester_id: string | null;
          nature: string;
          urgency: string;
          location: string;
          description: string;
          status: "Pending" | "In Progress" | "Completed" | "Cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id?: string | null;
          nature: string;
          urgency: string;
          location: string;
          description: string;
          status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
          created_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string | null;
          nature?: string | null;
          urgency?: string | null;
          location?: string | null;
          description?: string | null;
          status?: "Pending" | "In Progress" | "Completed" | "Cancelled" | null;
          created_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          is_read: boolean;
          link_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          is_read?: boolean;
          link_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          message?: string | null;
          is_read?: boolean | null;
          link_url?: string | null;
          created_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: number;
          request_id: string | null;
          actor_id: string | null;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          request_id?: string | null;
          actor_id?: string | null;
          action: string;
          created_at?: string;
        };
        Update: {
          id?: number | null;
          request_id?: string | null;
          actor_id?: string | null;
          action?: string | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ==========================================
// Utility Types for Application Use
// ==========================================

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type MaintenanceRequest =
  Database["public"]["Tables"]["maintenance_requests"]["Row"];
export type MaintenanceRequestInsert =
  Database["public"]["Tables"]["maintenance_requests"]["Insert"];
export type MaintenanceRequestUpdate =
  Database["public"]["Tables"]["maintenance_requests"]["Update"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type AuditLogInsert =
  Database["public"]["Tables"]["audit_logs"]["Insert"];
export type AuditLogUpdate =
  Database["public"]["Tables"]["audit_logs"]["Update"];

// ==========================================
// Common Enums and Constants
// ==========================================

export const DATABASE_ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export const VISUAL_ROLES = {
  TEACHER: "Teacher",
  STAFF: "Staff",
  STUDENT: "Student",
} as const;

export const THEME_PREFERENCES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export const REQUEST_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const URGENCY_LEVELS = {
  EMERGENCY: "Emergency",
  URGENT: "Urgent",
  NOT_URGENT: "Not Urgent",
} as const;

export type DatabaseRole = (typeof DATABASE_ROLES)[keyof typeof DATABASE_ROLES];
export type VisualRole = (typeof VISUAL_ROLES)[keyof typeof VISUAL_ROLES];
export type ThemePreference =
  (typeof THEME_PREFERENCES)[keyof typeof THEME_PREFERENCES];
export type RequestStatus =
  (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];
export type UrgencyLevel = (typeof URGENCY_LEVELS)[keyof typeof URGENCY_LEVELS];
