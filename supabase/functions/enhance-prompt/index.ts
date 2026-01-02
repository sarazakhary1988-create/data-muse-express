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
  // Task type for specialized prompts
  taskType?: 'lead' | 'company' | 'web_research' | 'scheduled' | 'general';
  // Person/company context for lead enrichment
  personName?: string;
  companyName?: string;
  targetRole?: string;
  // Timeframe for web research
  timeframe?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EnhanceRequest = await req.json();
    const { 
      description, industry, research_depth, source_types, geographic_focus, country, custom_websites,
      taskType, personName, companyName, targetRole, timeframe
    } = body;

    if (!description || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use OpenAI API for enhanced prompts
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "OpenAI API key not configured. Please add it in project settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build TASK-SPECIFIC context based on taskType
    const contextParts: string[] = [];
    if (industry) contextParts.push(`Industry: ${industry}`);
    if (research_depth) contextParts.push(`Research Depth: ${research_depth}`);
    if (source_types?.length) contextParts.push(`Preferred Sources: ${source_types.join(", ")}`);
    if (geographic_focus) contextParts.push(`Geographic Region: ${geographic_focus}`);
    if (country) contextParts.push(`Country Focus: ${country}`);
    if (timeframe) contextParts.push(`Timeframe: ${timeframe}`);
    if (custom_websites?.length) contextParts.push(`Priority Websites: ${custom_websites.join(", ")}`);
    
    // Add task-specific context
    if (taskType === 'lead' && personName) {
      contextParts.push(`Target Person: ${personName}`);
      if (companyName) contextParts.push(`Associated Company: ${companyName}`);
      if (targetRole) contextParts.push(`Role/Title: ${targetRole}`);
    }
    if (taskType === 'company' && companyName) {
      contextParts.push(`Target Company: ${companyName}`);
    }

    const contextStr = contextParts.length > 0 ? `\n\nResearch Context:\n${contextParts.join("\n")}` : "";

    // Generate TASK-SPECIFIC system prompts
    const getSystemPrompt = (): string => {
      const basePrompt = `You are an expert research query optimizer powered by OpenAI GPT-4o.`;
      
      switch (taskType) {
        case 'lead':
          return `${basePrompt} You specialize in person/lead research optimization.

TASK: Transform the user's description into an optimized prompt for PERSON RESEARCH.

CRITICAL REQUIREMENTS:
1. Focus on finding verified professional information about the target individual
2. Include search terms for: LinkedIn profile, professional biography, work history, education
3. Add context-aware filters: company association, industry, role title
4. Specify data points to extract: contact info, career trajectory, expertise areas
5. Include verification requirements: cross-reference multiple sources
6. Add social profile discovery: Twitter, personal website, publications
7. If a company is mentioned, include organizational context

FORMAT:
- Start with the person's full name and company
- List specific data points to research
- Include authority sources to prioritize (LinkedIn, company website, news)
- Specify verification requirements

Return ONLY the enhanced research prompt, no explanations.`;

        case 'company':
          return `${basePrompt} You specialize in company/organization research optimization.

TASK: Transform the user's description into an optimized prompt for COMPANY RESEARCH.

CRITICAL REQUIREMENTS:
1. Include search terms for: company overview, leadership team, financials, market position
2. Add data extraction targets: executives, board members, shareholders, investors
3. Specify financial data: revenue, funding rounds, valuation, acquisitions
4. Include competitive analysis context: competitors, market share, industry position
5. Add geographic context: headquarters, offices, operational regions
6. Require recent news and developments

FORMAT:
- Start with company name and industry
- List specific data categories to research
- Include authority sources (SEC filings, Crunchbase, company website)
- Specify leadership extraction requirements

Return ONLY the enhanced research prompt, no explanations.`;

        case 'web_research':
          return `${basePrompt} You specialize in comprehensive web research optimization.

TASK: Transform the user's description into an optimized prompt for WEB RESEARCH.

CRITICAL REQUIREMENTS:
1. Decompose the query into searchable sub-questions
2. Include temporal context (recent, historical, future projections)
3. Add specific keywords and phrases for search engines
4. Specify data types needed: statistics, reports, case studies, expert opinions
5. Include geographic and industry filters when relevant
6. Add verification requirements: multiple source confirmation
7. Specify authority sources: academic papers, official reports, verified news

FORMAT:
- State the core research question clearly
- List 3-5 specific sub-questions to investigate
- Include search keywords and phrases
- Specify source types and authority requirements

Return ONLY the enhanced research prompt, no explanations.`;

        case 'scheduled':
          return `${basePrompt} You specialize in automated/scheduled research optimization.

TASK: Transform the user's description into an optimized prompt for AUTOMATED RECURRING RESEARCH.

CRITICAL REQUIREMENTS:
1. Make the query time-aware (what's NEW since last run)
2. Include specific monitoring targets: news, announcements, filings
3. Add alerting criteria: significant changes, key events, threshold breaches
4. Specify extraction format for consistent reporting
5. Include comparison baseline for change detection
6. Add priority ranking for discovered information

FORMAT:
- State what to monitor and track
- List specific triggers/events to watch for
- Include time-based filters (last 24h, last week, etc.)
- Specify output format for automated reports

Return ONLY the enhanced research prompt, no explanations.`;

        default:
          return `${basePrompt} Your task is to transform user research descriptions into highly effective, detailed research prompts.

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
      }
    };

    const systemPrompt = getSystemPrompt();

    const userPrompt = `Original research description:
"${description}"${contextStr}

Please enhance this into an optimized, comprehensive research prompt.`;

    // Log original vs enhanced for debugging
    console.log(`[enhance-prompt] ===== PROMPT ENHANCEMENT LOG =====`);
    console.log(`[enhance-prompt] Task Type: ${taskType || 'general'}`);
    console.log(`[enhance-prompt] Original: "${description.slice(0, 150)}..."`);
    console.log(`[enhance-prompt] Context: ${contextStr.slice(0, 200)}`);
    console.log(`[enhance-prompt] Calling OpenAI API...`);

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
        max_tokens: 600,
        temperature: 0.5,
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

    // Log the enhancement result
    console.log(`[enhance-prompt] ===== ENHANCEMENT RESULT =====`);
    console.log(`[enhance-prompt] Enhanced: "${enhancedDescription.slice(0, 200)}..."`);
    console.log(`[enhance-prompt] Length: Original=${description.length}, Enhanced=${enhancedDescription.length}`);
    console.log(`[enhance-prompt] Model: gpt-4o-mini`);

    return new Response(
      JSON.stringify({
        enhanced_description: enhancedDescription,
        original_description: description,
        model: "gpt-4o-mini",
        taskType: taskType || 'general',
        enhancement_log: {
          original_length: description.length,
          enhanced_length: enhancedDescription.length,
          context_used: contextParts,
          timestamp: new Date().toISOString(),
        }
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
