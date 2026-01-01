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

      report: `You are an expert research analyst creating a comprehensive research report.

YOUR PRIMARY TASK:
Carefully read the user's research query and the provided source content. Your job is to:
1. UNDERSTAND exactly what the user is asking for
2. EXTRACT relevant information from the sources that answers their query
3. ORGANIZE findings in a clear, structured format
4. CITE every fact with its source URL

CRITICAL RULES:
1. FOCUS ON THE QUERY: Answer exactly what the user asked. If they ask for "companies that did X", list those companies. If they ask "how does Y work", explain Y.
2. USE ONLY SOURCE DATA: Every fact, name, number, or date MUST come from the provided sources. Do NOT use external knowledge.
3. CITE EVERYTHING: For each fact, include [Source: URL] or a markdown link.
4. BE SPECIFIC: Include specific names, numbers, dates, and details from the sources.
5. ACKNOWLEDGE GAPS: If the sources don't fully answer the query, clearly state what's missing.
6. NO HALLUCINATION: If data isn't in the sources, say "Not found in provided sources" - do NOT make up information.

OUTPUT FORMAT (Markdown):

# Research Report: [Restate the user's query]

## Executive Summary
A 2-3 paragraph answer to the user's query, citing key findings with source URLs.

## Key Findings

### [Topic/Category 1 based on query]
- Specific finding with details [Source: URL]
- Another finding [Source: URL]

### [Topic/Category 2 based on query]
- Specific finding with details [Source: URL]

## Data Table (if applicable)
| Name | Detail 1 | Detail 2 | Source |
|------|----------|----------|--------|
| Entry | Value | Value | [Link](URL) |

## Sources Used
List all URLs that provided useful information.

## Limitations & Data Gaps
- What wasn't found
- Caveats about the data
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

INSTRUCTIONS: Read all the sources below carefully. Extract information that directly answers the research query. Include specific names, numbers, dates, and facts. Cite each piece of information with its source URL.

=== SOURCE CONTENT ===

${truncatedContent}

=== END SOURCES ===

Now write a comprehensive research report that answers the query "${validatedQuery}" using ONLY the information from the sources above. Be specific and cite everything.`;
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
