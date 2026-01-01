import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  query: string;
  content: string;
  type: 'summarize' | 'analyze' | 'extract' | 'report' | 'verify';
  reportFormat?: 'detailed' | 'executive' | 'table';
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 100000; // 100KB max
const ALLOWED_TYPES = ['summarize', 'analyze', 'extract', 'report', 'verify'];
const ALLOWED_REPORT_FORMATS = ['detailed', 'executive', 'table'];

function validateQuery(query: unknown): string {
  if (typeof query !== 'string') return '';
  return query.trim().slice(0, MAX_QUERY_LENGTH);
}

function validateContent(content: unknown): { valid: boolean; error?: string; value?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required and must be a string' };
  }
  
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }
  
  // Truncate if too long (don't reject, just limit)
  return { valid: true, value: trimmed.slice(0, MAX_CONTENT_LENGTH) };
}

function validateType(type: unknown): 'summarize' | 'analyze' | 'extract' | 'report' | 'verify' {
  if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) {
    return 'analyze';
  }
  return type as 'summarize' | 'analyze' | 'extract' | 'report' | 'verify';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, content, type, reportFormat } = body as AnalyzeRequest;

    // Validate content
    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      console.error('Content validation failed:', contentValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: contentValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate other inputs
    const validatedQuery = validateQuery(query);
    const validatedType = validateType(type);
    const validatedFormat: string = ALLOWED_REPORT_FORMATS.includes(reportFormat || '') ? (reportFormat as string) : 'detailed';

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing content for query:', validatedQuery.substring(0, 100), '... type:', validatedType, 'format:', validatedFormat);

    const systemPrompts: Record<string, string> = {
      summarize: `You are a factual research assistant. Only use information explicitly stated in the provided sources. If something is not present in the sources, say "Not found in sources". Provide a concise summary and end with a short Sources list (URLs).`,
      
      analyze: `You are a factual research analyst. Only use information explicitly stated in the provided sources. Do not guess or fill gaps. If the sources are insufficient, say what is missing. Cite sources by URL for every important claim.`,
      
      extract: `You are a strict data extraction assistant. Extract ONLY facts that are explicitly present in the provided sources. If a field is missing, output "Not found". Include the source URL for each extracted item.`,
      
      verify: `You are a strict verification engine.

CRITICAL RULES:
1. Use ONLY the provided content excerpt; do NOT use external knowledge.
2. If the excerpt does not address the claim, return support="none".
3. If the excerpt clearly contradicts the claim, return support="contradicts".
4. If the excerpt supports the claim, choose the strongest justified support level.
5. Return ONLY a JSON object (no markdown, no code fences).`,

      report: getReportPrompt(validatedFormat),
    };

    function getReportPrompt(format: string): string {
      if (format === 'executive') {
        return `You are an expert research analyst writing a concise executive summary.

YOUR TASK: Create a brief, actionable executive summary that busy decision-makers can read in 2-3 minutes.

OUTPUT FORMAT (Markdown):

# Executive Summary: [Topic]

## Key Takeaways
- 3-5 bullet points with the most critical findings [1]
- Each point should be specific and actionable [2]

## Overview
One concise paragraph (4-5 sentences) summarizing the main findings and their significance. Use citations [1], [2].

## Critical Data Points
| Metric | Value | Context |
|--------|-------|---------|
| Key data in table format |

## Recommendations
2-3 concise, actionable recommendations based on findings.

## References
[1] Source - URL
[2] Source - URL`;
      }
      
      if (format === 'table') {
        return `You are a data extraction specialist creating structured tabular output.

YOUR TASK: Extract and organize all relevant data from sources into clear, well-structured tables.

OUTPUT FORMAT (Markdown):

# Data Report: [Topic]

## Summary Statistics
Brief 2-3 sentence overview of what data was found.

## Main Data Table
| Column 1 | Column 2 | Column 3 | Column 4 | Source |
|----------|----------|----------|----------|--------|
| Extract all relevant data into rows |

## Secondary Data (if applicable)
Additional tables for related data categories.

## Data Notes
- Any caveats about the data
- Missing information flagged

## Sources
[1] URL
[2] URL`;
      }

      // Default: detailed report
      const currentDate = new Date();
      return `You are an expert research analyst with comprehensive knowledge of global markets, companies, and current events.

CURRENT DATE: ${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

YOUR PRIMARY TASK:
Generate a COMPREHENSIVE, CONTENT-RICH research report that DIRECTLY ANSWERS the user's query with ACTUAL DATA and ANALYSIS.

CRITICAL INSTRUCTIONS:

1. GENERATE ACTUAL CONTENT - You MUST provide:
   - Specific company names, people, dates, and numbers
   - Real market data, trends, and performance metrics
   - Actual regulatory information and compliance details
   - Historical context with specific examples

2. DO NOT SAY:
   - "No data available" or "Cannot provide information"
   - "The sources do not contain..."
   - "Information not found" or similar phrases

3. USE YOUR KNOWLEDGE BASE to provide substantive information about:
   - Market performance (indices, IPOs, trading volumes)
   - Company specifics (names, leadership, financials)
   - Regulatory actions (specific fines, violations, announcements)
   - Industry trends and analysis

4. FOR FINANCIAL/MARKET QUERIES:
   - Include actual company names and tickers
   - Provide specific numbers (prices, percentages, volumes)
   - Name regulatory bodies and their actions
   - Reference actual market indices

5. FOR TIME-BASED QUERIES:
   - If asking about a past period (like "December 2025" when it's now January 2026), provide what HAPPENED
   - Include specific dates and events
   - Reference actual announcements and news

OUTPUT FORMAT (Markdown):

# [Clear, Specific Report Title]

## Executive Summary
2-3 paragraphs summarizing KEY FINDINGS with specific data points.

## [Topic-Specific Section 1]
### [Subsection with actual data]
Include tables, specific names, numbers, and analysis.

## [Topic-Specific Section 2]
Continue with detailed, substantive content.

## Data Summary
| Category | Item | Value/Details | Date/Notes |
|----------|------|---------------|------------|
| [Actual data in table format] |

## Key Insights & Analysis
Analytical synthesis with specific conclusions.

## References
Note: Based on AI knowledge synthesis as of knowledge cutoff date.`;
    }

    // Limit content size passed to AI
    const maxContentForAI = validatedType === 'verify' ? 8000 : 50000;
    const truncatedContent = contentValidation.value!.substring(0, maxContentForAI);

    // Build user content with clear structure
    let userContent: string;
    
    if (validatedType === 'verify') {
      userContent = `Claim: "${validatedQuery}"

Content excerpt:
${truncatedContent}

Return ONLY a JSON object (no markdown): { "support": "strong|moderate|weak|contradicts|none", "reason": "brief explanation" }`;
    } else if (validatedType === 'report') {
      const currentDate = new Date();
      userContent = `RESEARCH QUERY: "${validatedQuery}"

CURRENT DATE: ${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

YOUR TASK: Generate a comprehensive research report that DIRECTLY ANSWERS this query with ACTUAL DATA and SPECIFIC INFORMATION.

CRITICAL INSTRUCTIONS:
1. USE YOUR KNOWLEDGE to provide REAL information - company names, dates, numbers, market data
2. DO NOT say "no data available" or "sources do not contain" - provide what you KNOW
3. For financial queries: Include specific company names, tickers, prices, percentages
4. For time-based queries: If the period is in the past, report on what ACTUALLY HAPPENED
5. Include tables with actual data where appropriate
6. Be specific and substantive - no vague or generic responses

${truncatedContent && truncatedContent.length > 100 ? `
ADDITIONAL CONTEXT PROVIDED:
${truncatedContent}

Use this context to enhance your report, but do NOT limit yourself to only this content. Supplement with your knowledge base.
` : ''}

NOW GENERATE A DETAILED, SUBSTANTIVE REPORT WITH ACTUAL DATA for: "${validatedQuery}"`;
    } else {
      userContent = `Research Query: "${validatedQuery}"

Content to analyze:

${truncatedContent}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompts[validatedType] || systemPrompts.analyze },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    console.log('Analysis complete, result length:', result.length);
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to analyze' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
