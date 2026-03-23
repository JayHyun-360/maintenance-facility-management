import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GEMINI_API_KEY is not set");
}
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Default model
const DEFAULT_MODEL = "gemini-2.5-flash";

// Helper to get model instance
function getModel(modelName?: string) {
  const modelId = modelName || DEFAULT_MODEL;
  return genAI?.getGenerativeModel({ model: modelId });
}

// Helper function to analyze maintenance requests
export async function analyzeMaintenanceRequest(
  description: string,
  nature: string,
  location: string,
  modelName?: string,
) {
  const model = getModel(modelName);
  if (!model) {
    throw new Error("Gemini API not initialized - check GOOGLE_GEMINI_API_KEY");
  }
  try {
    const prompt = `
    Analyze this maintenance request and provide insights:
    
    Nature: ${nature}
    Location: ${location}
    Description: ${description}
    
    Please provide:
    1. Urgency level (Emergency/Urgent/Not Urgent)
    2. Estimated complexity (Low/Medium/High)
    3. Suggested action items
    4. Potential risks or concerns
    
    Respond in JSON format with these keys: urgency, complexity, actions, risks
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse as JSON, fallback to text if needed
    try {
      return JSON.parse(text);
    } catch {
      return { rawResponse: text };
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to analyze maintenance request");
  }
}

// Helper function for admin chat assistance with enhanced capabilities
export async function getAdminAssistance(
  query: string,
  context?: any,
  attachments?: { type: string; data: string; name: string }[],
  modelName?: string,
) {
  const model = getModel(modelName);
  if (!model) {
    throw new Error("Gemini API not initialized - check GOOGLE_GEMINI_API_KEY");
  }

  const lowerQuery = query.toLowerCase();

  // Determine if we need to fetch additional data
  const needsDatabaseQuery = shouldUseDatabaseQuery(lowerQuery);
  const needsWebSearch = shouldUseWebSearch(lowerQuery);

  let dbResults: any = null;
  let webResults: any = null;

  // Fetch database results if needed
  if (needsDatabaseQuery) {
    try {
      const dbResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/ai/database-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query }),
        },
      );
      const dbData = await dbResponse.json();
      if (dbData.success) {
        dbResults = dbData;
      }
    } catch (e) {
      console.error("Database query failed:", e);
    }
  }

  // Fetch web search results if needed
  if (needsWebSearch) {
    try {
      const webResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/ai/web-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        },
      );
      const webData = await webResponse.json();
      if (webData.success) {
        webResults = webData;
      }
    } catch (e) {
      console.error("Web search failed:", e);
    }
  }

  try {
    const parts: any[] = [];

    // Check if we have image attachments
    const imageAttachments =
      attachments?.filter((att) => att.type.startsWith("image/")) || [];
    const hasImages = imageAttachments.length > 0;

    // Build text prompt with conversational, suggestive behavior
    let promptText = `You are a helpful, thoughtful AI assistant. You're friendly, concise, and always consider what would be most useful to the user.

Current Dashboard Context (only use if relevant to their question):
${
  context
    ? `Status: ${context.totalRequests || "N/A"} total requests, ${context.pendingRequests || "N/A"} pending, ${context.activeRequests || "N/A"} in progress, ${context.completedRequests || "N/A"} completed`
    : "Dashboard data not available"
}

User Query: "${query}"

IMPORTANT BEHAVIORAL GUIDELINES:
1. NEVER start responses by mentioning "maintenance facility management" or "this system" unless the user explicitly asks about it
2. Instead of listing features or capabilities, ASK if they'd like to explore something
3. Be conversational - use phrases like "Would you like to know more about...?" or "I can help you with that, or we could also discuss..."
4. After answering their question, suggest 1-2 relevant follow-up topics they might find helpful
5. Keep responses concise and natural - like a helpful colleague, not a product brochure

Example of what to do:
- User: "Hi" → "Hello! How can I help you today? I can assist with analyzing requests, generating reports, or answering questions about your dashboard."
- User: "What can you do?" → "I can help with quite a few things! Would you like to explore your current request status, discuss trends, or perhaps go through a specific request together?"

Example of what NOT to do:
- "As an AI assistant for a maintenance facility management system, I can help you with..."
- Don't list capabilities upfront - let them discover them naturally`;

    // Add database query results if available
    if (dbResults?.success && dbResults.data?.length > 0) {
      promptText += `

DATABASE QUERY RESULTS:
${dbResults.summary || ""}

${formatDatabaseResults(dbResults.data)}

Use this data to answer the user's question accurately.`;
    }

    // Add web search results if available
    if (webResults?.success) {
      promptText += `

WEB SEARCH RESULTS:
${webResults.formatted || ""}

Use this information to supplement your answer if relevant.`;
    }

    // If web search is needed but not configured, inform the user
    if (
      needsWebSearch &&
      !webResults?.success &&
      webResults?.needsConfiguration
    ) {
      promptText += `

NOTE: The user is asking about information that may require current web data. Web search is not currently configured. You can suggest enabling it for more up-to-date information.`;
    }

    // If images are attached, add explicit analysis instructions
    if (hasImages) {
      promptText += `

IMPORTANT - IMAGE ANALYSIS REQUESTED:
You have been provided with ${imageAttachments.length} image(s) to analyze. Please:
1. Describe what you see in the image(s) in detail
2. Provide a thorough visual analysis
3. Answer any specific questions the user has about the image(s)

Image details:`;
      imageAttachments.forEach((att, index) => {
        promptText += `\n- Image ${index + 1}: ${att.name} (${att.type})`;
      });
    }

    promptText += `

${
  context?.attachedRequest
    ? `
Attached Request Details:
- ID: ${context.attachedRequest.id}
- Nature: ${context.attachedRequest.nature}
- Description: ${context.attachedRequest.description}
- Location: ${context.attachedRequest.location}
- Status: ${context.attachedRequest.status}
- Created: ${context.attachedRequest.createdAt}
`
    : ""
}

When answering questions, use the database query results and web search results provided above to give accurate, specific answers.
When images are provided, always include a detailed visual analysis section in your response.
After providing your answer, ALWAYS suggest 1-2 follow-up topics the user might find helpful. Frame them as questions like "Would you like to know more about...?" or "I can also help you with..."`;

    parts.push({ text: promptText });

    // Add attachments as inline data - images first for better context
    if (attachments && attachments.length > 0) {
      console.log(`[AI] Processing ${attachments.length} attachment(s)`);
      for (const att of attachments) {
        console.log(
          `[AI] Attachment: ${att.name}, type: ${att.type}, data length: ${att.data?.length || 0}`,
        );
        if (att.type.startsWith("image/")) {
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: att.data,
            },
          });
        } else {
          // For non-image files, describe them in text
          parts.push({
            text: `[File: ${att.name} (${att.type}) - Base64 data available for analysis]`,
          });
        }
      }
    }

    console.log(`[AI] Sending request with ${parts.length} parts to Gemini`);
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API error in getAdminAssistance:", error);
    console.error("Original error message:", error?.message);
    console.error("Original error stack:", error?.stack);

    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      throw new Error(
        "AI service quota exceeded. Please try again later or upgrade your plan.",
      );
    }
    throw new Error(`Failed to get AI assistance: ${errorMessage}`);
  }
}

// Determine if query requires database lookup
function shouldUseDatabaseQuery(query: string): boolean {
  const dbTriggers = [
    "show me",
    "list",
    "get all",
    "find",
    "search",
    "how many",
    "count",
    "total",
    "what are",
    "give me",
    "display",
    "view",
    "recent",
    "latest",
    "oldest",
    "pending",
    "completed",
    "in progress",
    "by status",
    "by nature",
    "by urgency",
    "by location",
    "this week",
    "this month",
    "today",
    "users",
    "profiles",
    "announcements",
    "notifications",
    "audit",
    "history",
    "logs",
  ];
  return dbTriggers.some((trigger) => query.includes(trigger));
}

// Determine if query requires web search
function shouldUseWebSearch(query: string): boolean {
  const webTriggers = [
    "current",
    "latest",
    "news",
    "weather",
    "today's",
    "what is the",
    "how do i",
    "how to",
    "what's the best",
    "recommend",
    "compare",
    "price",
    "cost",
    "buy",
    "purchase",
    "external",
    "online",
    "internet",
    "search for",
    "look up",
    "find information",
  ];
  return webTriggers.some((trigger) => query.includes(trigger));
}

// Format database results for prompt
function formatDatabaseResults(data: any[]): string {
  if (!data || data.length === 0) return "No data found.";

  const limitedData = data.slice(0, 20); // Limit to 20 items for prompt size

  return limitedData
    .map((item, index) => {
      // Handle maintenance requests
      if (item.nature) {
        return `[${index + 1}] ID: ${item.id}, Nature: ${item.nature}, Status: ${item.status}, Urgency: ${item.urgency}, Location: ${item.location}, Created: ${item.created_at?.split("T")[0] || "N/A"}`;
      }
      // Handle profiles
      if (item.full_name) {
        return `[${index + 1}] Name: ${item.full_name}, Role: ${item.visual_role || item.database_role}, Email: ${item.email || "N/A"}`;
      }
      // Handle announcements
      if (item.title) {
        return `[${index + 1}] Title: ${item.title}, Message: ${item.message?.substring(0, 100)}..., Created: ${item.created_at?.split("T")[0] || "N/A"}`;
      }
      // Handle notifications
      if (item.notification_type) {
        return `[${index + 1}] Title: ${item.title}, Read: ${item.is_read}, Created: ${item.created_at?.split("T")[0] || "N/A"}`;
      }
      return `[${index + 1}] ${JSON.stringify(item).substring(0, 100)}`;
    })
    .join("\n");
}

// Helper function to generate smart responses
export async function generateResponseSuggestion(
  request: any,
  modelName?: string,
) {
  const model = getModel(modelName);
  if (!model) {
    throw new Error("Gemini API not initialized - check GOOGLE_GEMINI_API_KEY");
  }
  try {
    const prompt = `
    Generate a professional response for this maintenance request:
    
    Request Details:
    - Nature: ${request.nature}
    - Urgency: ${request.urgency}
    - Location: ${request.location}
    - Description: ${request.description}
    - Requester: ${request.profiles?.full_name || "Unknown"}
    
    Generate a response that:
    1. Acknowledges the request
    2. Sets expectations for resolution time
    3. Asks for any additional information if needed
    4. Maintains a professional and helpful tone
    
    Keep the response under 200 words.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response suggestion");
  }
}
