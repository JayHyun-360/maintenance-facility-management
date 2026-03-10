import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { conversationId, role, content, attachments } = await request.json();

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId, role, content" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ai_chat_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        attachments: attachments || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from("ai_chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, message: data });
  } catch (error: any) {
    console.error("Save message error:", error);
    return NextResponse.json(
      { error: "Failed to save message", details: error?.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required parameter: conversationId" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, messages: data || [] });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages", details: error?.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required parameter: conversationId" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("ai_chat_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation", details: error?.message },
      { status: 500 },
    );
  }
}
