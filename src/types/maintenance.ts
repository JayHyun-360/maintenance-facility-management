export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  supporting_reasons?: string | null;
  category: string;
  urgency: string;
  location_building: string;
  location_room?: string | null;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled" | "Reviewed";
  requester_id: string;
  action_taken?: string | null;
  work_evaluation?:
    | "Outstanding"
    | "Very Satisfactory"
    | "Satisfactory"
    | "Poor"
    | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    full_name: string;
    email: string;
    visual_role?: string;
  } | null;
}

export interface WorkOrderFormData {
  title: string;
  description: string;
  supporting_reasons?: string;
  category: string;
  urgency: string;
  location_building: string;
  location_room?: string;
}

export interface WorkOrderCompletionData {
  action_taken: string;
  work_evaluation:
    | "Outstanding"
    | "Very Satisfactory"
    | "Satisfactory"
    | "Poor";
}

export interface RequestAnalytics {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  requests_by_visual_role: {
    Teacher: number;
    Staff: number;
    Student: number;
  };
  work_quality_distribution: {
    Outstanding: number;
    "Very Satisfactory": number;
    Satisfactory: number;
    Poor: number;
  };
  requests_by_category: Record<string, number>;
  requests_by_urgency: {
    Emergency: number;
    High: number;
    Medium: number;
    Low: number;
  };
}

export const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Cleaning",
  "Carpentry",
  "Personnel Services",
  "Others",
] as const;

export const URGENCY_LEVELS = ["Emergency", "High", "Medium", "Low"] as const;

export const WORK_EVALUATIONS = [
  "Outstanding",
  "Very Satisfactory",
  "Satisfactory",
  "Poor",
] as const;

export const VISUAL_ROLES = ["Teacher", "Staff", "Student"] as const;
