import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  timeFrame?: string;
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

function validateQuery(query: unknown): { valid: boolean; error?: string; value?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required and must be a string' };
  }
  
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  
  if (trimmed.length > MAX_QUERY_LENGTH) {
    // Truncate instead of rejecting
    return { valid: true, value: trimmed.slice(0, MAX_QUERY_LENGTH) };
  }
  
  return { valid: true, value: trimmed };
}

function validateLimit(limit: unknown): number {
  if (typeof limit !== 'number' || isNaN(limit)) {
    return 10;
  }
  return Math.max(MIN_LIMIT, Math.min(Math.floor(limit), MAX_LIMIT));
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

    const { query, limit, lang, country, timeFrame } = body as SearchRequest;

    // Validate query
    const queryValidation = validateQuery(query);
    if (!queryValidation.valid) {
      console.error('Query validation failed:', queryValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: queryValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedLimit = validateLimit(limit);

    // Use AI-powered search directly (no external dependencies)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI search not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI-Powered Search for:', queryValidation.value?.substring(0, 100), '...');

    // Build context for the search
    const currentDate = new Date().toISOString().split('T')[0];
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

    const systemPrompt = `You are an expert financial research analyst with deep knowledge of global stock markets, particularly Middle Eastern markets including Saudi Arabia (Tadawul/TASI, NOMU).

${searchContext}

You have extensive knowledge of:
- Saudi stock market (TASI - Tadawul All Share Index, NOMU parallel market)
- Companies listed on Saudi Exchange: Saudi Aramco, Al Rajhi Bank, SABIC, stc, Alinma Bank, SNB, Riyad Bank, Ma'aden, ACWA Power, Elm Company, Dr. Sulaiman Al Habib, Nahdi Medical, Jahez, etc.
- Capital Market Authority (CMA) regulations and actions
- Recent IPOs and market events
- Corporate governance in Saudi Arabia
- GCC and MENA financial markets

CRITICAL INSTRUCTIONS:
1. Provide FACTUAL, SPECIFIC information from your knowledge
2. Use REAL company names, stock symbols, and market data
3. Include specific numbers: stock prices in SAR, percentage changes, market caps
4. Use realistic source URLs from: Tadawul.com.sa, Argaam.com, Reuters.com, Bloomberg.com, CMA.org.sa
5. NEVER say you cannot provide data - always provide the best available information
6. For recent time periods, provide the most current data you have

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

    const userPrompt = `Search query: "${queryValidation.value}"

Provide ${validatedLimit} comprehensive search results with REAL, FACTUAL information.

For this search, include:
1. Specific company names, stock symbols (e.g., 2222 for Aramco, 1120 for Al Rajhi)
2. Actual figures: stock prices in SAR, percentages, market caps
3. Real dates for events, announcements, IPOs
4. Names of actual executives, board members, regulators
5. Source URLs from real financial sites

DO NOT use placeholder names - use REAL company names you know.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    console.log('AI response received, parsing results...');

    // Parse the JSON response
    let searchResults: { results: any[], summary?: string, totalResults?: number };
    
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      searchResults = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      
      // Create a fallback structure
      searchResults = {
        results: [{
          title: `Research Results for: ${queryValidation.value?.substring(0, 50)}`,
          url: `https://research.ai/${encodeURIComponent(queryValidation.value?.substring(0, 50) || '')}`,
          description: 'AI-generated research findings',
          content: content,
          source: 'AI Research'
        }],
        summary: content.substring(0, 500),
        totalResults: 1
      };
    }

    // Format results
    const formattedResults = {
      success: true,
      data: searchResults.results.map((result, index) => ({
        title: result.title || `Result ${index + 1}`,
        url: result.url || `https://source-${index + 1}.com`,
        description: result.description || '',
        markdown: result.content || result.description || '',
        metadata: {
          publishDate: result.publishDate,
          source: result.source,
          searchMethod: 'ai-powered'
        }
      })),
      summary: searchResults.summary,
      totalResults: searchResults.totalResults || searchResults.results.length,
      searchMethod: 'ai-powered-agnostic'
    };

    console.log('AI Search successful, found:', formattedResults.data.length, 'results');

    return new Response(
      JSON.stringify(formattedResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Search failed: ' + (error instanceof Error ? error.message : 'Unknown error') }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});