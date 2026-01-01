import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  query: string;
  content: string;
  type: 'summarize' | 'analyze' | 'extract' | 'report' | 'verify';
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 100000; // 100KB max
const ALLOWED_TYPES = ['summarize', 'analyze', 'extract', 'report', 'verify'];

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

    const { query, content, type } = body as AnalyzeRequest;

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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing content for query:', validatedQuery.substring(0, 100), '... type:', validatedType);

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

      report: `You are an expert research analyst writing a comprehensive, substantive research report.

YOUR PRIMARY TASK:
Write a DETAILED, CONTENT-RICH report that thoroughly answers the user's research query. The report should read like a professional research document, NOT a list of links.

CRITICAL WRITING RULES:
1. WRITE SUBSTANTIVE CONTENT: Each section should have multiple paragraphs of detailed analysis, not just bullet points or links.
2. SYNTHESIZE INFORMATION: Combine information from multiple sources into coherent narratives and insights.
3. USE INLINE CITATIONS: Reference sources using numbered citations like [1], [2], etc. DO NOT put URLs inline in the text.
4. BE COMPREHENSIVE: Include background context, detailed findings, analysis, comparisons, and implications.
5. INCLUDE DATA: Present specific numbers, dates, names, statistics, and facts from sources.
6. ORGANIZE LOGICALLY: Structure the report with clear sections that flow naturally.

WHAT NOT TO DO:
- DO NOT just list links or URLs in the main content
- DO NOT write shallow one-line bullet points
- DO NOT put raw URLs in the middle of sentences
- DO NOT skip analysis and just quote sources

OUTPUT FORMAT (Markdown):

# [Clear Report Title Based on Query]

## Executive Summary
Write 3-4 paragraphs providing a comprehensive overview of the findings. Include key facts, numbers, and conclusions. Use citations like [1], [2].

## Background & Context
Provide relevant background information to understand the topic. Explain why this matters and any important context.

## Detailed Findings

### [Subtopic 1]
Write 2-3 detailed paragraphs analyzing this aspect. Include specific data, examples, and insights. Reference sources with [1], [2], etc.

### [Subtopic 2]
Continue with substantive analysis. Compare different sources, highlight trends, discuss implications.

### [Additional Subtopics as needed]
...

## Data Summary
If applicable, include a table summarizing key data points:
| Item | Details | Value | Notes |
|------|---------|-------|-------|

## Analysis & Insights
Provide your analytical synthesis of the findings. What patterns emerge? What conclusions can be drawn?

## Limitations
Note any gaps in the available data or caveats about the findings.

## References
List all sources at the end with numbered citations:
[1] Source Title - URL
[2] Source Title - URL
[3] Source Title - URL
`,
    };

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
      userContent = `RESEARCH QUERY: "${validatedQuery}"

YOUR TASK: Write a comprehensive, content-rich research report that thoroughly answers this query. 

IMPORTANT INSTRUCTIONS:
- Write detailed paragraphs, not just bullet points or links
- Synthesize information into coherent analysis
- Use numbered citations [1], [2], [3] in the text
- List all references with URLs at the END of the report under "## References"
- Include specific facts, data, names, dates, and statistics
- Provide context, analysis, and insights

=== SOURCE MATERIALS ===

${truncatedContent}

=== END SOURCE MATERIALS ===

Now write a detailed, substantive research report answering: "${validatedQuery}"

Remember: Write like a professional analyst. Substantive content first, all source URLs listed at the end under References.`;
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
