import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, title } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ai_chat_conversations")
      .insert({
        user_id: userId,
        title: title || "New Conversation",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, conversation: data });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation", details: error?.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ai_chat_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, conversations: data || [] });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Failed to get conversations", details: error?.message },
      { status: 500 },
    );
  }
}
