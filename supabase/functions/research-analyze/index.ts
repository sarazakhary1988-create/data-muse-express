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
      report: `You are a strict, source-grounded research report writer.

CRITICAL RULES:
1. Use ONLY information explicitly stated in the provided sources
2. Every claim MUST be backed by a citation to a Source URL
3. If the sources don't contain enough information to fully answer the query, clearly state what's missing
4. Do NOT invent, assume, or hallucinate any data (names, dates, numbers, etc.)
5. If sources contradict each other, note the contradiction

OUTPUT FORMAT (Markdown):
# Research Report: [User's Query]

## Executive Summary
Brief answer to the user's query based solely on available sources.

## Detailed Findings
Present the key information found in sources. Use tables when listing multiple items.
- Include relevant quotes or data points
- Cite source URLs for every fact

## Sources Used
- Bulleted list of all URLs that provided information

## Data Gaps & Limitations
- What information was requested but not found in sources
- Any caveats about source reliability or coverage
`,
    };

    // Limit content size passed to AI
    const maxContentForAI = validatedType === 'verify' ? 8000 : 50000;
    const truncatedContent = contentValidation.value!.substring(0, maxContentForAI);

    const userContent =
      validatedType === 'verify'
        ? `Claim: "${validatedQuery}"

Content excerpt:
${truncatedContent}

Return ONLY a JSON object (no markdown): { "support": "strong|moderate|weak|contradicts|none", "reason": "brief explanation" }`
        : `Research Query: "${validatedQuery}"

Content to analyze:

${truncatedContent}`;

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
