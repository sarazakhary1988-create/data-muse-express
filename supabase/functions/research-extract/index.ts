import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  query: string;
  content: string;
  extractType: 'entities' | 'companies' | 'dates' | 'facts' | 'all';
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 50000; // 50KB max
const MIN_CONTENT_LENGTH = 50;
const ALLOWED_EXTRACT_TYPES = ['entities', 'companies', 'dates', 'facts', 'all'];

function validateQuery(query: unknown): string {
  if (typeof query !== 'string') return '';
  return query.trim().slice(0, MAX_QUERY_LENGTH);
}

function validateContent(content: unknown): { valid: boolean; error?: string; value?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required and must be a string' };
  }
  
  const trimmed = content.trim();
  if (trimmed.length < MIN_CONTENT_LENGTH) {
    // Return empty data for short content instead of error
    return { valid: true, value: '' };
  }
  
  return { valid: true, value: trimmed.slice(0, MAX_CONTENT_LENGTH) };
}

function validateExtractType(extractType: unknown): 'entities' | 'companies' | 'dates' | 'facts' | 'all' {
  if (typeof extractType !== 'string' || !ALLOWED_EXTRACT_TYPES.includes(extractType)) {
    return 'all';
  }
  return extractType as 'entities' | 'companies' | 'dates' | 'facts' | 'all';
}

// Regex-based company extraction as fallback
function extractCompaniesWithRegex(content: string): Array<{ name: string; action?: string; source_url?: string }> {
  const companies: Array<{ name: string; action?: string }> = [];
  const seen = new Set<string>();
  
  // Common company name patterns
  const patterns = [
    // "X Company", "X Corporation", "X Inc", etc.
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Company|Corporation|Corp|Inc|Ltd|LLC|Group|Holdings|Holding|Industries|International|Enterprises)\b/g,
    // "X Co." pattern
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+Co\.\b/g,
    // Arabic/Saudi company patterns
    /\b(?:شركة|مؤسسة|مجموعة)\s+([^\s,،.]+(?:\s+[^\s,،.]+)*)\b/g,
    // "The X Company" pattern
    /\bThe\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Company|Corporation|Corp|Group)\b/g,
    // IPO-specific patterns
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:IPO|listing|filed\s+for\s+IPO|plans?\s+to\s+list|going\s+public)\b/gi,
    // Stock ticker patterns like (ARAMCO) or [2222]
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*\(([A-Z]{2,5}|\d{4})\)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 2 && name.length < 50 && !seen.has(name.toLowerCase())) {
        // Filter out common false positives
        const lowerName = name.toLowerCase();
        if (!['the', 'this', 'that', 'which', 'where', 'when', 'what', 'how', 'new', 'old', 'first', 'last'].includes(lowerName)) {
          seen.add(lowerName);
          companies.push({ name, action: 'Mentioned in sources' });
        }
      }
    }
    pattern.lastIndex = 0; // Reset regex
  }
  
  return companies;
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

    const { query, content, extractType } = body as ExtractRequest;

    // Validate content
    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      console.error('Content validation failed:', contentValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: contentValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return empty data for too-short content
    if (!contentValidation.value) {
      console.log('Content too short for extraction');
      return new Response(
        JSON.stringify({ success: true, data: { entities: [], companies: [], dates: [], facts: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate other inputs
    const validatedQuery = validateQuery(query);
    const validatedExtractType = validateExtractType(extractType);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting structured data for query:', validatedQuery.substring(0, 100), 'type:', validatedExtractType);

    // Limit content for AI processing
    const truncatedContent = contentValidation.value.substring(0, 30000);

    // Check if this is an IPO/company query for enhanced extraction
    const isIPOQuery = /\b(ipo|ipos|initial\s+public\s+offering|listing|listings|going\s+public)\b/i.test(validatedQuery);
    const isCompanyQuery = /\b(companies|company|firms?|corporations?|entities|businesses)\b/i.test(validatedQuery);
    
    const entityExtractionPrompt = (isIPOQuery || isCompanyQuery) 
      ? `CRITICAL: This query is about specific companies/IPOs. You MUST extract EVERY company name mentioned, even if details are incomplete. Look for:
- Company names mentioned in any context
- Organizations planning or undergoing IPOs
- Firms mentioned as listing or going public
- Any business entity names in the content

For each company found, extract as much detail as available. If only the name is mentioned, still include it with "name" field filled.`
      : '';

    // Use tool calling for structured extraction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a precise data extraction assistant. Extract ONLY information that is explicitly stated in the provided content. Do not infer or assume any data. ${entityExtractionPrompt}` 
          },
          { 
            role: 'user', 
            content: `Research Query: "${validatedQuery}"

Content to analyze:
${truncatedContent}

Extract all relevant structured data from this content related to the query. ${(isIPOQuery || isCompanyQuery) ? 'IMPORTANT: Extract EVERY company/organization name mentioned, even with minimal details.' : ''}` 
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_research_data',
              description: 'Extract structured research data from content',
              parameters: {
                type: 'object',
                properties: {
                  companies: {
                    type: 'array',
                    description: 'Companies mentioned with relevant details',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Company name' },
                        ticker: { type: 'string', description: 'Stock ticker if mentioned' },
                        market: { type: 'string', description: 'Market/exchange (e.g., TASI, NOMU)' },
                        action: { type: 'string', description: 'Action type (IPO, listing, acquisition, etc.)' },
                        date: { type: 'string', description: 'Relevant date if mentioned' },
                        value: { type: 'string', description: 'Monetary value if mentioned' },
                        source_url: { type: 'string', description: 'Source URL if available' }
                      },
                      required: ['name']
                    }
                  },
                  key_dates: {
                    type: 'array',
                    description: 'Important dates mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: 'The date' },
                        event: { type: 'string', description: 'What happened on this date' },
                        entity: { type: 'string', description: 'Related entity' }
                      },
                      required: ['date', 'event']
                    }
                  },
                  key_facts: {
                    type: 'array',
                    description: 'Key factual claims from the content',
                    items: {
                      type: 'object',
                      properties: {
                        fact: { type: 'string', description: 'The factual claim' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in this fact' },
                        source: { type: 'string', description: 'Where this fact came from' }
                      },
                      required: ['fact']
                    }
                  },
                  numeric_data: {
                    type: 'array',
                    description: 'Numbers and statistics mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        metric: { type: 'string', description: 'What is being measured' },
                        value: { type: 'string', description: 'The numeric value' },
                        unit: { type: 'string', description: 'Unit of measurement' },
                        context: { type: 'string', description: 'Additional context' }
                      },
                      required: ['metric', 'value']
                    }
                  }
                },
                required: ['companies', 'key_dates', 'key_facts', 'numeric_data']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_research_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Parse tool call result
    let extractedData = {
      companies: [] as Array<{ name: string; ticker?: string; market?: string; action?: string; date?: string; value?: string; source_url?: string }>,
      key_dates: [] as Array<{ date: string; event: string; entity?: string }>,
      key_facts: [] as Array<{ fact: string; confidence?: string; source?: string }>,
      numeric_data: [] as Array<{ metric: string; value: string; unit?: string; context?: string }>
    };
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    // SECONDARY EXTRACTION: If this is an IPO/company query and we got 0 companies, try regex extraction
    if ((isIPOQuery || isCompanyQuery) && (!extractedData.companies || extractedData.companies.length === 0)) {
      console.log('Zero companies from AI extraction, attempting regex fallback...');
      
      const regexCompanies = extractCompaniesWithRegex(truncatedContent);
      if (regexCompanies.length > 0) {
        console.log(`Regex extraction found ${regexCompanies.length} potential companies`);
        extractedData.companies = regexCompanies;
      }
    }

    console.log('Extraction complete:', {
      companies: extractedData.companies?.length || 0,
      dates: extractedData.key_dates?.length || 0,
      facts: extractedData.key_facts?.length || 0,
      numeric: extractedData.numeric_data?.length || 0
    });

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to extract' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
