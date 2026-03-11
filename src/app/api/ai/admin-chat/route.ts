import { NextRequest, NextResponse } from "next/server";
import { getAdminAssistance } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let query: string;
    let context: any;
    let attachments: { type: string; data: string; name: string }[] = [];
    let modelName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      query = formData.get("query") as string;
      const contextStr = formData.get("context") as string;
      context = contextStr ? JSON.parse(contextStr) : undefined;
      modelName = formData.get("model") as string | undefined;

      const files = formData.getAll("attachments") as File[];
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        attachments.push({
          type: file.type,
          data: base64,
          name: file.name,
        });
      }
    } else {
      const body = await request.json();
      query = body.query;
      context = body.context;
      modelName = body.model;
    }

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 },
      );
    }

    const response = await getAdminAssistance(
      query,
      context,
      attachments,
      modelName,
    );

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
