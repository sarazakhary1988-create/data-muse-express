import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  webSourcesAvailable?: boolean;
  userQuery?: string;
  objective?: string;
  constraints?: string;
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 100000;
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

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(`${Date.now() - startTime}ms: ${msg}`);
  };

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

    const { query, content, type, reportFormat, webSourcesAvailable, userQuery, objective, constraints } = body as AnalyzeRequest;

    log(`Request received: type=${type}, queryLength=${query?.length || 0}, contentLength=${content?.length || 0}`);

    // Validate content - for reports, allow empty content with LLM-first approach
    const contentValidation = validateContent(content);
    const hasContent: boolean = contentValidation.valid === true && 
      typeof contentValidation.value === 'string' && 
      contentValidation.value.length > 100;
    
    // For report type, we can proceed even without web content (LLM-first)
    if (type !== 'report' && !contentValidation.valid) {
      log(`Content validation failed: ${contentValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: contentValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedQuery = validateQuery(query || userQuery);
    if (!validatedQuery) {
      log('Query validation failed: empty query');
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const validatedType = validateType(type);
    const validatedFormat: string = ALLOWED_REPORT_FORMATS.includes(reportFormat || '') ? (reportFormat as string) : 'detailed';

    // Use OpenAI API
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      log('ERROR: OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured. Please add it in project settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log(`Analyzing with OpenAI: query="${validatedQuery.substring(0, 100)}...", type=${validatedType}, format=${validatedFormat}, hasContent=${hasContent}`);

    // Build system prompts with deterministic report contract
    const systemPrompts: Record<string, string> = {
      summarize: `You are a factual research assistant powered by OpenAI GPT-4o. Only use information explicitly stated in the provided sources. If something is not present in the sources, say "Not found in sources". Provide a concise summary and end with a short Sources list (URLs).`,
      
      analyze: `You are a factual research analyst powered by OpenAI GPT-4o. Only use information explicitly stated in the provided sources. Do not guess or fill gaps. If the sources are insufficient, say what is missing. Cite sources by URL for every important claim.`,
      
      extract: `You are a strict data extraction assistant powered by OpenAI GPT-4o. Extract ONLY facts that are explicitly present in the provided sources. If a field is missing, output "Not found". Include the source URL for each extracted item.`,
      
      verify: `You are a strict verification engine powered by OpenAI GPT-4o.

CRITICAL RULES:
1. Use ONLY the provided content excerpt; do NOT use external knowledge.
2. If the excerpt does not address the claim, return support="none".
3. If the excerpt clearly contradicts the claim, return support="contradicts".
4. If the excerpt supports the claim, choose the strongest justified support level.
5. Return ONLY a JSON object (no markdown, no code fences).`,

      report: getReportPrompt(validatedFormat, hasContent, Boolean(webSourcesAvailable)),
    };

    function getReportPrompt(format: string, hasWebContent: boolean, webSourcesAttempted: boolean): string {
      const currentDate = new Date();
      const sourceLabel = hasWebContent 
        ? 'Based on real-time web sources' 
        : (webSourcesAttempted 
            ? 'Web sources unavailable — generated from model knowledge + provided inputs' 
            : 'Generated from model knowledge');
      
      const baseInstructions = `You are an expert research analyst powered by OpenAI GPT-4o generating a STRUCTURED research report.

CURRENT DATE: ${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

SOURCE CONTEXT: ${sourceLabel}

CRITICAL: You MUST generate a complete, substantive report with ALL required sections.

REQUIRED REPORT STRUCTURE (Markdown):

# [Title Based on Query - Be Specific]

## Executive Summary
- [5-8 bullet points summarizing key findings]
- Each bullet must be specific and actionable
- Include metrics, dates, and names where available

## Key Findings
1. **[Finding 1 Title]**: [Detailed explanation with evidence]
2. **[Finding 2 Title]**: [Detailed explanation with evidence]
3. **[Finding 3 Title]**: [Detailed explanation with evidence]
(Include at least 3-5 numbered findings)

## Evidence & Reasoning
Explain WHY each finding is true. Provide:
- Supporting data points
- Logical reasoning
- Cross-references between findings

## Data & Assumptions
| Category | Data Point | Source/Basis |
|----------|------------|--------------|
| [List explicit data used and assumptions made] |

## Actionable Recommendations
1. **[HIGH PRIORITY]**: [Specific action step]
2. **[MEDIUM PRIORITY]**: [Specific action step]
3. **[LOW PRIORITY]**: [Specific action step]

## Open Questions
- [What needs further verification?]
- [What data is missing?]
- [What should be investigated next?]

## Sources
${hasWebContent ? '[List actual URLs used with domain citations]' : `Note: ${sourceLabel}`}

---
Generated by: OpenAI GPT-4o | Manus 1.6 MAX Research Engine
Generated: ${currentDate.toISOString()}
`;

      if (format === 'executive') {
        return baseInstructions + `

ADDITIONAL INSTRUCTIONS FOR EXECUTIVE FORMAT:
- Keep total length under 800 words
- Focus on actionable insights for decision-makers
- Lead with the most important findings
- Use concise bullet points`;
      }
      
      if (format === 'table') {
        return baseInstructions + `

ADDITIONAL INSTRUCTIONS FOR TABLE FORMAT:
- Maximize use of tables for data presentation
- Include a main summary table with all key data
- Use additional tables for comparisons, timelines, metrics
- Keep narrative text minimal`;
      }

      // Detailed format - default
      return baseInstructions + `

ADDITIONAL INSTRUCTIONS FOR DETAILED FORMAT:
- Provide comprehensive analysis with 1500-2500 words
- Include subsections within each major section as needed
- Use tables, lists, and formatting for clarity
- Provide thorough evidence and reasoning for all claims`;
    }

    // Limit content size passed to AI
    const maxContentForAI = validatedType === 'verify' ? 8000 : 50000;
    const truncatedContent = hasContent ? contentValidation.value!.substring(0, maxContentForAI) : '';

    // Build user content
    let userContent: string;
    
    if (validatedType === 'verify') {
      userContent = `Claim: "${validatedQuery}"

Content excerpt:
${truncatedContent}

Return ONLY a JSON object (no markdown): { "support": "strong|moderate|weak|contradicts|none", "reason": "brief explanation" }`;
    } else if (validatedType === 'report') {
      const isSaudi = /\b(saudi|tadawul|tasi|nomu|cma|riyadh)\b/i.test(validatedQuery);

      const saudiGuardrails = isSaudi ? `
SAUDI MARKET GUARDRAILS (NON-NEGOTIABLE):
- No synthetic financial data: do NOT invent companies, tickers, IPO prices, returns, market caps, subscription ratios, P/E, or any numbers.
- Every numeric or factual claim MUST be directly supported by the provided sources and include a citation.
- If a requested metric/event is not present in sources, write "Data not yet available in retrieved sources".
` : '';

      userContent = `RESEARCH QUERY: "${validatedQuery}"
${objective ? `\nOBJECTIVE: ${objective}` : ''}
${constraints ? `\nCONSTRAINTS: ${constraints}` : ''}

${saudiGuardrails}

${hasContent ? `SOURCES TO USE:
${truncatedContent}

INSTRUCTIONS:
- Generate report using the provided sources
- Cite sources with [Source: domain] or [1], [2] format
- If information is missing, state it clearly in "Open Questions"
` : `NO WEB SOURCES AVAILABLE

INSTRUCTIONS:
- Generate report using your knowledge base
- Clearly label this as "Generated from model knowledge"
- Be specific about what information would need verification
- Include "Open Questions" section for items that need external verification
- Do NOT fabricate specific data, statistics, or citations
- Focus on frameworks, general knowledge, and analytical structure
`}

Generate the complete research report following the REQUIRED STRUCTURE above:`;
    } else {
      userContent = `Research Query: "${validatedQuery}"

Content to analyze:

${truncatedContent}`;
    }

    log(`Calling OpenAI API with ${userContent.length} chars of content`);

    // Select model based on task complexity
    const model = validatedType === 'report' ? 'gpt-4o' : 'gpt-4o-mini';
    const maxTokens = validatedType === 'report' ? 4096 : 2048;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompts[validatedType] || systemPrompts.analyze },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`OpenAI API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid OpenAI API key. Please check your configuration.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `OpenAI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content || '';
    log(`OpenAI response received, length: ${result.length}`);

    // For reports, validate structure and regenerate if needed
    if (validatedType === 'report' && result && result.length < 500) {
      log('Report too short, regenerating with stronger instructions...');
      
      const regeneratePrompt = `${userContent}

CRITICAL: Your previous response was too short or incomplete.
Generate a COMPLETE, COMPREHENSIVE research report with:
- At least 5 bullet points in Executive Summary
- At least 3 Key Findings with detailed evidence
- At least 3 prioritized Recommendations
- Data tables where appropriate
- Total length: 1500+ words for detailed format

Generate the COMPLETE report now:`;

      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompts.report },
            { role: 'user', content: regeneratePrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const newResult = retryData.choices?.[0]?.message?.content || '';
        if (newResult.length > result.length) {
          result = newResult;
          log(`Regenerated result length: ${result.length}`);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    log(`Analysis complete in ${totalTime}ms, result length: ${result.length}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        metadata: {
          model: model,
          webSourcesUsed: hasContent,
          generatedAt: new Date().toISOString(),
          processingTime: totalTime,
          regenerated: logs.some(l => l.includes('Regenerating')),
        },
        logs: logs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[research-analyze] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: logs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
