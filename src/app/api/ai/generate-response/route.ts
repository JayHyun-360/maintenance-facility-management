import { NextRequest, NextResponse } from "next/server";
import { generateResponseSuggestion } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    if (!requestData) {
      return NextResponse.json(
        { error: "Missing request data" },
        { status: 400 }
      );
    }

    const suggestion = await generateResponseSuggestion(requestData);

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error("Response generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate response suggestion" },
      { status: 500 }
    );
  }
}
