import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query, includeRawResults } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }

    // Check for API key - support multiple providers
    const tavilyKey = process.env.TAVILY_API_KEY;
    const serperKey = process.env.SERPER_API_KEY;

    let searchResults: any[] = [];
    let errorMessage = "";

    // Try Tavily first (often has free tier)
    if (tavilyKey) {
      try {
        const tavilyResponse = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: query,
            max_results: 5,
            include_answer: true,
            include_raw_content: false,
          }),
        });

        if (tavilyResponse.ok) {
          const tavilyData = await tavilyResponse.json();
          searchResults = (tavilyData.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          }));
        }
      } catch (e: any) {
        console.error("Tavily search error:", e);
      }
    }

    // Try Serper if Tavily failed
    if (searchResults.length === 0 && serperKey) {
      try {
        const serperResponse = await fetch(
          "https://google.serper.dev/search?q=" + encodeURIComponent(query),
          {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ num: 5 }),
          }
        );

        if (serperResponse.ok) {
          const serperData = await serperResponse.json();
          searchResults = (serperData.organic || []).map((r: any) => ({
            title: r.title,
            url: r.link,
            content: r.snippet,
          }));
        }
      } catch (e: any) {
        console.error("Serper search error:", e);
      }
    }

    // If no API keys configured, return informative message
    if (searchResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Web search not configured. Set TAVILY_API_KEY or SERPER_API_KEY environment variable to enable.",
        needsConfiguration: true,
        query: query,
      });
    }

    // Format results for AI consumption
    const formattedResults = searchResults
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content || ""}`
      )
      .join("\n\n");

    return NextResponse.json({
      success: true,
      query,
      results: includeRawResults ? searchResults : undefined,
      formatted: formattedResults,
      resultCount: searchResults.length,
    });
  } catch (error: any) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: "Failed to perform web search", details: error?.message },
      { status: 500 }
    );
  }
}
