import { NextRequest, NextResponse } from "next/server";
import { getAdminAssistance } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 },
      );
    }

    const response = await getAdminAssistance(query, context);

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Admin chat error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      {
        error: "Failed to get AI assistance",
        details: error?.message,
        stack: error?.stack,
      },
      { status: 500 },
    );
  }
}
