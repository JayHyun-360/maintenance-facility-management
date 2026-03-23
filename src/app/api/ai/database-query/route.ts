import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  summary?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, table } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }

    const normalizedQuery = query.toLowerCase().trim();
    let result: QueryResult = { success: false };

    // Determine which table to query based on the query content
    const targetTable = determineTable(normalizedQuery, table);

    switch (targetTable) {
      case "maintenance_requests":
        result = await queryMaintenanceRequests(normalizedQuery);
        break;
      case "profiles":
        result = await queryProfiles(normalizedQuery);
        break;
      case "announcements":
        result = await queryAnnouncements(normalizedQuery);
        break;
      case "notifications":
        result = await queryNotifications(normalizedQuery);
        break;
      case "audit_logs":
        result = await queryAuditLogs(normalizedQuery);
        break;
      default:
        // Default to maintenance requests
        result = await queryMaintenanceRequests(normalizedQuery);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Database query error:", error);
    return NextResponse.json(
      { error: "Failed to execute query", details: error?.message },
      { status: 500 }
    );
  }
}

function determineTable(query: string, preferredTable?: string): string {
  if (preferredTable && ["maintenance_requests", "profiles", "announcements", "notifications", "audit_logs"].includes(preferredTable)) {
    return preferredTable;
  }

  const tableKeywords: Record<string, string[]> = {
    maintenance_requests: ["request", "maintenance", "ticket", "issue", "repair", "work order", "pending", "completed", "progress", "status", "nature", "location", "description"],
    profiles: ["user", "profile", "account", "student", "teacher", "staff", "role"],
    announcements: ["announcement", "broadcast", "notice", "message"],
    notifications: ["notification", "alert", "reminder"],
    audit_logs: ["audit", "log", "history", "action", "activity"]
  };

  for (const [table, keywords] of Object.entries(tableKeywords)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return table;
    }
  }

  return "maintenance_requests";
}

async function queryMaintenanceRequests(query: string): Promise<QueryResult> {
  try {
    let queryBuilder = supabase.from("maintenance_requests").select(`
      *,
      profiles (id, full_name, visual_role, educational_level)
    `);

    // Apply filters based on query content
    if (query.includes("pending")) {
      queryBuilder = queryBuilder.eq("status", "Pending");
    } else if (query.includes("progress") || query.includes("in progress") || query.includes("active")) {
      queryBuilder = queryBuilder.eq("status", "In Progress");
    } else if (query.includes("completed") || query.includes("done")) {
      queryBuilder = queryBuilder.eq("status", "Completed");
    } else if (query.includes("cancelled") || query.includes("cancel")) {
      queryBuilder = queryBuilder.eq("status", "Cancelled");
    }

    // Filter by urgency
    if (query.includes("emergency") || query.includes("urgent")) {
      queryBuilder = queryBuilder.eq("urgency", "Emergency");
    } else if (query.includes("high priority") || query.includes("critical")) {
      queryBuilder = queryBuilder.eq("urgency", "Urgent");
    }

    // Filter by nature
    const natures = ["plumbing", "electrical", "carpentry", "masonry", "personnel", "hvac", "painting"];
    for (const nature of natures) {
      if (query.includes(nature)) {
        queryBuilder = queryBuilder.ilike("nature", `%${nature}%`);
        break;
      }
    }

    // Time-based filters
    if (query.includes("today")) {
      const today = new Date().toISOString().split("T")[0];
      queryBuilder = queryBuilder.gte("created_at", today);
    } else if (query.includes("this week") || query.includes("week")) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      queryBuilder = queryBuilder.gte("created_at", weekAgo);
    } else if (query.includes("this month") || query.includes("month")) {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      queryBuilder = queryBuilder.gte("created_at", monthAgo);
    }

    // Sorting
    if (query.includes("oldest") || query.includes("first")) {
      queryBuilder = queryBuilder.order("created_at", { ascending: true });
    } else {
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
    }

    // Limit results
    const limit = extractLimit(query);
    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    // Generate summary
    const summary = generateRequestSummary(data || [], query);

    return {
      success: true,
      data: data || [],
      summary
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function queryProfiles(query: string): Promise<QueryResult> {
  try {
    let queryBuilder = supabase.from("profiles").select("*");

    // Filter by role
    if (query.includes("admin")) {
      queryBuilder = queryBuilder.eq("database_role", "admin");
    } else if (query.includes("user") && !query.includes("admin")) {
      queryBuilder = queryBuilder.eq("database_role", "user");
    }

    // Filter by visual role
    if (query.includes("student")) {
      queryBuilder = queryBuilder.eq("visual_role", "Student");
    } else if (query.includes("teacher") || query.includes("faculty")) {
      queryBuilder = queryBuilder.eq("visual_role", "Teacher");
    } else if (query.includes("staff")) {
      queryBuilder = queryBuilder.eq("visual_role", "Staff");
    }

    // Filter by blocked status
    if (query.includes("block")) {
      queryBuilder = queryBuilder.eq("is_blocked", true);
    }

    // Sort by creation date
    queryBuilder = queryBuilder.order("created_at", { ascending: false });

    const limit = extractLimit(query);
    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    const summary = `Found ${data?.length || 0} user profile(s)`;

    return {
      success: true,
      data: data || [],
      summary
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function queryAnnouncements(query: string): Promise<QueryResult> {
  try {
    let queryBuilder = supabase.from("announcements").select("*");

    if (query.includes("recent") || query.includes("latest")) {
      queryBuilder = queryBuilder.order("created_at", { ascending: false }).limit(5);
    } else {
      queryBuilder = queryBuilder.order("created_at", { ascending: false }).limit(10);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      summary: `Found ${data?.length || 0} announcement(s)`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function queryNotifications(query: string): Promise<QueryResult> {
  try {
    let queryBuilder = supabase.from("notifications").select("*");

    if (query.includes("unread") || query.includes("new")) {
      queryBuilder = queryBuilder.eq("is_read", false);
    }

    queryBuilder = queryBuilder.order("created_at", { ascending: false }).limit(20);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    const unreadCount = (data || []).filter((n: any) => !n.is_read).length;

    return {
      success: true,
      data: data || [],
      summary: `Found ${data?.length || 0} notification(s), ${unreadCount} unread`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function queryAuditLogs(query: string): Promise<QueryResult> {
  try {
    let queryBuilder = supabase.from("audit_logs").select(`
      *,
      profiles (full_name)
    `);

    // Filter by action type
    if (query.includes("status")) {
      queryBuilder = queryBuilder.ilike("action", "%status%");
    } else if (query.includes("delete")) {
      queryBuilder = queryBuilder.ilike("action", "%delete%");
    } else if (query.includes("create") || query.includes("new")) {
      queryBuilder = queryBuilder.ilike("action", "%create%");
    }

    // Time filter
    if (query.includes("today")) {
      const today = new Date().toISOString().split("T")[0];
      queryBuilder = queryBuilder.gte("created_at", today);
    }

    queryBuilder = queryBuilder.order("created_at", { ascending: false }).limit(50);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      summary: `Found ${data?.length || 0} audit log entry(ies)`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function extractLimit(query: string): number {
  const numberMatch = query.match(/(\d+)\s*(items?|results?|records?)/i);
  if (numberMatch) {
    return Math.min(parseInt(numberMatch[1]), 100); // Cap at 100
  }
  
  // Default limits based on query type
  if (query.includes("all") || query.includes("total") || query.includes("count")) {
    return 100;
  }
  return 10;
}

function generateRequestSummary(data: any[], query: string): string {
  if (!data || data.length === 0) {
    return "No matching requests found";
  }

  const total = data.length;
  const byStatus: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};

  data.forEach((req: any) => {
    byStatus[req.status] = (byStatus[req.status] || 0) + 1;
    byUrgency[req.urgency] = (byUrgency[req.urgency] || 0) + 1;
  });

  let summary = `Found ${total} request(s). `;
  
  if (Object.keys(byStatus).length > 0) {
    summary += "Status: " + Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(", ") + ". ";
  }
  
  if (Object.keys(byUrgency).length > 0 && !query.includes("status")) {
    summary += "Urgency: " + Object.entries(byUrgency).map(([u, c]) => `${c} ${u}`).join(", ") + ".";
  }

  return summary;
}
