import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GEMINI_API_KEY is not set");
}
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Get the generative model
const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper function to analyze maintenance requests
export async function analyzeMaintenanceRequest(
  description: string,
  nature: string,
  location: string,
) {
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

// Helper function for admin chat assistance
export async function getAdminAssistance(query: string, context?: any) {
  if (!model) {
    throw new Error("Gemini API not initialized - check GOOGLE_GEMINI_API_KEY");
  }
  try {
    const prompt = `
    You are an AI assistant for a maintenance facility management system. 
    Help the administrator with their query: "${query}"
    
    ${context ? `Context: ${JSON.stringify(context)}` : ""}
    
    Provide helpful, actionable advice for managing maintenance requests, user communications, and system optimization.
    Keep responses concise and relevant to facility management.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to get AI assistance");
  }
}

// Helper function to generate smart responses
export async function generateResponseSuggestion(request: any) {
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
