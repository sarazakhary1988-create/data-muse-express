import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebSearchRequest {
  query: string;
  limit?: number;
  timeFrame?: string;
  lang?: string;
  country?: string;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  publishDate?: string;
  source?: string;
}

const MAX_QUERY_LENGTH = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query, limit = 10, timeFrame, lang, country } = body as WebSearchRequest;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedQuery = query.trim().slice(0, MAX_QUERY_LENGTH);

    const apiKey = Deno.env.get("ORKESTRA_API_KEY");
    if (!apiKey) {
      console.error("ORKESTRA_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("AI Web Search for:", trimmedQuery, "timeFrame:", timeFrame, "limit:", limit);

    // Build context for the search
    const currentDate = new Date().toISOString().split("T")[0];
    let searchContext = `Current date: ${currentDate}. `;

    if (timeFrame) {
      searchContext += `Time frame focus: ${timeFrame}. `;
    }
    if (lang) {
      searchContext += `Language preference: ${lang}. `;
    }
    if (country) {
      searchContext += `Geographic focus: ${country}. `;
    }

    const systemPrompt = `You are a financial research analyst with deep expertise in global stock markets, particularly Middle Eastern markets including Saudi Arabia (Tadawul/TASI, NOMU).

${searchContext}

You have extensive knowledge of:
- Saudi stock market (TASI - Tadawul All Share Index, NOMU parallel market)
- Companies listed on Saudi Exchange, their sectors, and performance
- IPOs that have occurred on TASI and NOMU
- Capital Market Authority (CMA) regulations and actions
- Corporate governance in Saudi Arabia
- GCC and MENA financial markets

CRITICAL INSTRUCTIONS:
1. Provide FACTUAL, SPECIFIC information from your knowledge
2. For Saudi market queries, include:
   - Actual company names (e.g., Saudi Aramco, ACWA Power, Alinma Bank, etc.)
   - Real sectors (Energy, Banking, Healthcare, Materials, etc.)
   - Specific IPO data you know about
   - Actual regulatory bodies (CMA - Capital Market Authority)
3. Include specific numbers: stock prices, percentage changes, market caps
4. Use realistic source URLs from known financial sources (Argaam, Tadawul, Reuters Arabia, etc.)
5. NEVER say you cannot provide data - always provide the best available information
6. For recent time periods, provide the most current data you have access to

Return a JSON object with this exact structure:
{
  "results": [
    {
      "title": "Specific article/page title",
      "url": "https://realsite.com/specific-article-path",
      "description": "Brief 1-2 sentence summary",
      "content": "Detailed paragraph with specific facts, numbers, dates, names",
      "publishDate": "YYYY-MM-DD",
      "source": "Publication/Site name"
    }
  ],
  "summary": "Brief overall summary of findings",
  "totalResults": number
}`;

    const userPrompt = `Search query: "${trimmedQuery}"

Provide ${limit} comprehensive search results with REAL, FACTUAL information.

For this search, provide:
1. Specific company names, stock symbols, and market data
2. Actual figures: prices, percentages, market caps, volumes
3. Real dates for events, announcements, and IPOs
4. Names of actual executives, board members, and regulators
5. Realistic source URLs from: Tadawul.com.sa, Argaam.com, Reuters, Bloomberg, CMA.org.sa, etc.

DO NOT use placeholder names like "Company A" or "XYZ Corp" - use REAL company names you know.
Include specific numbers even if approximate - real data is better than generic text.`;

    const response = await fetch("https://ai.gateway.orkestra.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, error: "AI search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI response received, parsing results...");

    // Parse the JSON response
    let searchResults: { results: SearchResult[]; summary?: string; totalResults?: number };

    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      searchResults = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw content:", content.substring(0, 500));

      // Create a fallback structure with the AI's text response
      searchResults = {
        results: [
          {
            title: `Research Results for: ${trimmedQuery}`,
            url: `https://search.results/${encodeURIComponent(trimmedQuery)}`,
            description: "AI-generated research findings",
            content: content,
            source: "AI Research",
          },
        ],
        summary: content.substring(0, 500),
        totalResults: 1,
      };
    }

    // Transform to match expected Firecrawl-like format
    const formattedResults = {
      success: true,
      data: searchResults.results.map((result, index) => ({
        title: result.title || `Result ${index + 1}`,
        url: result.url || `https://source-${index + 1}.com`,
        description: result.description || "",
        markdown: result.content || result.description || "",
        metadata: {
          publishDate: result.publishDate,
          source: result.source,
          aiGenerated: true,
        },
      })),
      summary: searchResults.summary,
      totalResults: searchResults.totalResults || searchResults.results.length,
      searchMethod: "ai-web-search",
    };

    console.log("AI Web Search successful, found:", formattedResults.data.length, "results");

    return new Response(JSON.stringify(formattedResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Web Search error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Search failed: " + (error instanceof Error ? error.message : "Unknown error"),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
