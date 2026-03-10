import { NextRequest, NextResponse } from "next/server";
import { analyzeMaintenanceRequest } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { description, nature, location } = await request.json();

    if (!description || !nature || !location) {
      return NextResponse.json(
        { error: "Missing required fields: description, nature, location" },
        { status: 400 }
      );
    }

    const analysis = await analyzeMaintenanceRequest(description, nature, location);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze request" },
      { status: 500 }
    );
  }
}
