import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  limit?: number;
  scrapeContent?: boolean;
  lang?: string;
  country?: string;
  tbs?: string;
}

// Input validation constants
const MAX_QUERY_LENGTH = 1000;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;
const ALLOWED_LANGS = ['en', 'ar', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'ru', 'it', 'nl', 'pl', 'tr'];
const ALLOWED_COUNTRIES = ['us', 'uk', 'ae', 'sa', 'eg', 'de', 'fr', 'es', 'it', 'jp', 'cn', 'kr', 'br', 'in', 'au', 'ca'];
const ALLOWED_TBS_PATTERNS = /^(qdr:[hdwmy]|cdr:1,cd_min:\d{1,2}\/\d{1,2}\/\d{4},cd_max:\d{1,2}\/\d{1,2}\/\d{4})$/;

function validateQuery(query: unknown): { valid: boolean; error?: string; value?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required and must be a string' };
  }
  
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query must be less than ${MAX_QUERY_LENGTH} characters` };
  }
  
  return { valid: true, value: trimmed };
}

function validateLimit(limit: unknown): number {
  if (typeof limit !== 'number' || isNaN(limit)) {
    return 12;
  }
  return Math.max(MIN_LIMIT, Math.min(Math.floor(limit), MAX_LIMIT));
}

function validateLang(lang: unknown): string | undefined {
  if (typeof lang !== 'string') return undefined;
  const normalized = lang.toLowerCase().trim();
  return ALLOWED_LANGS.includes(normalized) ? normalized : undefined;
}

function validateCountry(country: unknown): string | undefined {
  if (typeof country !== 'string') return undefined;
  const normalized = country.toLowerCase().trim();
  return ALLOWED_COUNTRIES.includes(normalized) ? normalized : undefined;
}

function validateTbs(tbs: unknown): string | undefined {
  if (typeof tbs !== 'string') return undefined;
  const trimmed = tbs.trim();
  return ALLOWED_TBS_PATTERNS.test(trimmed) ? trimmed : undefined;
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

    const { query, limit, scrapeContent, lang, country, tbs } = body as SearchRequest;

    // Validate query
    const queryValidation = validateQuery(query);
    if (!queryValidation.valid) {
      console.error('Query validation failed:', queryValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: queryValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize other inputs
    const validatedLimit = validateLimit(limit);
    const validatedLang = validateLang(lang);
    const validatedCountry = validateCountry(country);
    const validatedTbs = validateTbs(tbs);
    const validatedScrapeContent = typeof scrapeContent === 'boolean' ? scrapeContent : false;

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('FIRECRAWL_API_KEY not configured - using AI web search fallback');
      
      // Use AI web search as fallback
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'No search provider configured', fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Call AI web search function
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const aiSearchResponse = await fetch(`${supabaseUrl}/functions/v1/ai-web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          query: queryValidation.value,
          limit: validatedLimit,
          timeFrame: validatedTbs,
          lang: validatedLang,
          country: validatedCountry,
        }),
      });
      
      const aiSearchData = await aiSearchResponse.json();
      console.log('AI Web Search fallback result:', aiSearchData.success, 'results:', aiSearchData.data?.length || 0);
      
      return new Response(
        JSON.stringify(aiSearchData),
        { status: aiSearchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for:', queryValidation.value, 'with limit:', validatedLimit);

    const requestBody: Record<string, unknown> = {
      query: queryValidation.value,
      limit: validatedLimit,
    };

    if (validatedLang) requestBody.lang = validatedLang;
    if (validatedCountry) requestBody.country = validatedCountry;
    if (validatedTbs) requestBody.tbs = validatedTbs;

    if (validatedScrapeContent) {
      requestBody.scrapeOptions = {
        formats: ['markdown'],
        onlyMainContent: true,
      };
    }

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search successful, found:', data.data?.length || 0, 'results');
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to search' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
