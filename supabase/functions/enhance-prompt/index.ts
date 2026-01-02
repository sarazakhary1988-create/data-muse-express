import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnhanceRequest {
  description: string;
  industry?: string;
  research_depth?: string;
  source_types?: string[];
  geographic_focus?: string;
  country?: string;
  custom_websites?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EnhanceRequest = await req.json();
    const { description, industry, research_depth, source_types, geographic_focus, country, custom_websites } = body;

    if (!description || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use OpenAI API
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "OpenAI API key not configured. Please add it in project settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from filters
    const contextParts: string[] = [];
    if (industry) contextParts.push(`Industry: ${industry}`);
    if (research_depth) contextParts.push(`Depth: ${research_depth}`);
    if (source_types?.length) contextParts.push(`Sources: ${source_types.join(", ")}`);
    if (geographic_focus) contextParts.push(`Region: ${geographic_focus}`);
    if (country) contextParts.push(`Country: ${country}`);
    if (custom_websites?.length) contextParts.push(`Custom sources: ${custom_websites.join(", ")}`);

    const contextStr = contextParts.length > 0 ? `\n\nResearch Context:\n${contextParts.join("\n")}` : "";

    const systemPrompt = `You are an expert research query optimizer powered by OpenAI GPT-4o. Your task is to transform user research descriptions into highly effective, detailed research prompts that will yield comprehensive and accurate results from search engines and data sources.

Guidelines for enhancement:
1. Make the query specific and actionable
2. Include key aspects to investigate
3. Specify the type of information needed (statistics, trends, comparisons, case studies)
4. Add temporal context (recent, historical, future projections)
5. Include relevant sub-topics and related areas
6. Maintain the original intent while expanding scope appropriately
7. Keep the enhanced prompt concise but comprehensive (max 200 words)
8. Format with clear structure using bullet points or numbered lists where helpful
9. Add specific entity names, tickers, and identifiers when implied
10. Include geographic and industry context when relevant

Return ONLY the enhanced research prompt, no explanations or meta-commentary.`;

    const userPrompt = `Original research description:
"${description}"${contextStr}

Please enhance this research description into an optimized, comprehensive research prompt that will yield maximum relevant results from web searches.`;

    console.log("[enhance-prompt] Calling OpenAI API for:", description.slice(0, 100));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid OpenAI API key. Please check your configuration." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedDescription) {
      throw new Error("No enhanced description generated");
    }

    console.log("[enhance-prompt] Successfully enhanced with OpenAI GPT-4o-mini");

    return new Response(
      JSON.stringify({
        enhanced_description: enhancedDescription,
        original_description: description,
        model: "gpt-4o-mini",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in enhance-prompt:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
