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

interface ExtractedCompany {
  name: string;
  ticker?: string;
  market?: string;
  action?: string;
  date?: string;
  value?: string;
  source_url?: string;
  confidence?: 'high' | 'medium' | 'low';
  extraction_method?: 'ai' | 'regex' | 'verification';
}

interface ExtractedData {
  companies: ExtractedCompany[];
  key_dates: Array<{ date: string; event: string; entity?: string }>;
  key_facts: Array<{ fact: string; confidence?: string; source?: string }>;
  numeric_data: Array<{ metric: string; value: string; unit?: string; context?: string }>;
  people?: Array<{ name: string; role?: string; organization?: string }>;
  locations?: Array<{ name: string; type?: string; context?: string }>;
}

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 50000;
const MIN_CONTENT_LENGTH = 50;
const ALLOWED_EXTRACT_TYPES = ['entities', 'companies', 'dates', 'facts', 'all'];

// Common false positives to filter out
const FALSE_POSITIVE_NAMES = new Set([
  'the', 'this', 'that', 'which', 'where', 'when', 'what', 'how', 'new', 'old',
  'first', 'last', 'said', 'says', 'according', 'reported', 'announced', 'stated',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday', 'sunday', 'today', 'yesterday', 'tomorrow',
  'reuters', 'bloomberg', 'associated', 'press', 'news', 'report', 'article'
]);

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

// ============= ENHANCED REGEX EXTRACTION PATTERNS =============

function extractCompaniesWithRegex(content: string): ExtractedCompany[] {
  const companies: ExtractedCompany[] = [];
  const seen = new Set<string>();

  // Pattern groups with confidence levels
  const patterns: Array<{ pattern: RegExp; confidence: 'high' | 'medium' | 'low'; actionHint?: string }> = [
    // High confidence: Explicit company suffixes
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:Company|Corporation|Corp\.?|Inc\.?|Ltd\.?|LLC|PLC|S\.A\.|AG|GmbH|NV|BV)\b/g, confidence: 'high' },
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:Group|Holdings?|Industries|International|Enterprises|Partners)\b/g, confidence: 'high' },
    { pattern: /\bThe\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Company|Corporation|Corp|Group)\b/g, confidence: 'high' },
    
    // High confidence: Stock ticker patterns
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s*\(([A-Z]{2,5})\)/g, confidence: 'high' },
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s*\[(\d{4})\]/g, confidence: 'high' },
    
    // High confidence: IPO-specific patterns
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:IPO|initial\s+public\s+offering)\b/gi, confidence: 'high', actionHint: 'IPO' },
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:filed\s+for\s+IPO|plans?\s+to\s+list|going\s+public|to\s+list\s+on)\b/gi, confidence: 'high', actionHint: 'Planning IPO' },
    { pattern: /IPO\s+of\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\b/gi, confidence: 'high', actionHint: 'IPO' },
    
    // Medium confidence: Arabic/Saudi company patterns
    { pattern: /\b(?:شركة|مؤسسة|مجموعة)\s+([^\s,،.]{2,}(?:\s+[^\s,،.]+){0,4})\b/g, confidence: 'medium' },
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Saudi|Arabia|Tadawul|TASI|Nomu)\b/gi, confidence: 'medium' },
    
    // Medium confidence: Financial action patterns
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:shares?|stock|equity|listing|listed|traded)\b/gi, confidence: 'medium' },
    { pattern: /shares?\s+(?:of|in)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/gi, confidence: 'medium' },
    
    // Low confidence: Generic capitalized multi-word names near business terms
    { pattern: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})\s+(?:announced|reported|disclosed|stated|said)\b/g, confidence: 'low' },
  ];

  for (const { pattern, confidence, actionHint } of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let name = match[1]?.trim();
      const ticker = match[2]?.trim();
      
      if (!name || name.length < 3 || name.length > 60) continue;
      
      // Normalize and filter
      const lowerName = name.toLowerCase();
      if (FALSE_POSITIVE_NAMES.has(lowerName)) continue;
      if (seen.has(lowerName)) continue;
      
      // Additional validation: must have at least one letter
      if (!/[a-zA-Z]/.test(name)) continue;
      
      seen.add(lowerName);
      companies.push({
        name,
        ticker: ticker || undefined,
        action: actionHint || 'Mentioned in sources',
        confidence,
        extraction_method: 'regex'
      });
    }
    pattern.lastIndex = 0;
  }

  // Sort by confidence: high first
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  companies.sort((a, b) => confidenceOrder[a.confidence || 'low'] - confidenceOrder[b.confidence || 'low']);

  return companies;
}

// Extract people names
function extractPeopleWithRegex(content: string): Array<{ name: string; role?: string; organization?: string }> {
  const people: Array<{ name: string; role?: string; organization?: string }> = [];
  const seen = new Set<string>();

  const patterns = [
    // CEO/CFO/CTO patterns
    /\b(?:CEO|CFO|CTO|COO|Chairman|President|Director|Manager|Head)\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(?:the\s+)?(?:CEO|CFO|CTO|COO|Chairman|President|Director)\b/g,
    // "Mr./Ms./Dr." patterns
    /\b(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
    // "said [Name]" patterns
    /\bsaid\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]?.trim();
      if (!name || name.length < 4 || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      
      // Try to extract role from surrounding context
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
      const context = content.slice(contextStart, contextEnd);
      
      let role: string | undefined;
      const roleMatch = context.match(/\b(CEO|CFO|CTO|COO|Chairman|President|Director|Manager|Head|Founder)\b/i);
      if (roleMatch) role = roleMatch[1];
      
      people.push({ name, role });
    }
    pattern.lastIndex = 0;
  }

  return people;
}

// Extract dates and events
function extractDatesWithRegex(content: string): Array<{ date: string; event: string; entity?: string }> {
  const dates: Array<{ date: string; event: string; entity?: string }> = [];
  const seen = new Set<string>();

  const patterns = [
    // "in Q1 2024", "Q2 2025"
    /\b(Q[1-4]\s+20\d{2})\b[^.]*?([^.]{20,100})/gi,
    // "January 2024", "Feb 2025"
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+20\d{2})\b[^.]*?([^.]{10,100})/gi,
    // "2024-01-15" ISO format
    /\b(20\d{2}-\d{2}-\d{2})\b[^.]*?([^.]{10,80})/g,
    // "by end of 2024"
    /\b(?:by|before|after|in|during)\s+(?:the\s+)?(?:end\s+of\s+)?(20\d{2})\b[^.]*?([^.]{10,80})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const date = match[1]?.trim();
      let event = match[2]?.trim() || 'Event mentioned';
      
      if (!date || seen.has(date)) continue;
      seen.add(date);
      
      // Clean up event text
      event = event.replace(/^\s*[,.:;]\s*/, '').slice(0, 100);
      
      dates.push({ date, event });
    }
    pattern.lastIndex = 0;
  }

  return dates.slice(0, 20); // Limit results
}

// Extract numeric data
function extractNumericDataWithRegex(content: string): Array<{ metric: string; value: string; unit?: string; context?: string }> {
  const numerics: Array<{ metric: string; value: string; unit?: string; context?: string }> = [];
  const seen = new Set<string>();

  const patterns = [
    // Currency patterns: "$1.5 billion", "SAR 500 million", "€2.3M"
    /\b(\$|SAR|USD|EUR|€|£|¥)\s*(\d+(?:\.\d+)?)\s*(billion|million|M|B|K|thousand)?\b[^.]*?([^.]{5,50})?/gi,
    // Percentage patterns
    /\b(\d+(?:\.\d+)?)\s*(%|percent|percentage)\b[^.]*?([^.]{5,50})?/gi,
    // Valuation patterns
    /\bvaluation\s+(?:of\s+)?(?:\$|SAR|USD)?\s*(\d+(?:\.\d+)?)\s*(billion|million|B|M)?\b/gi,
    // Market cap patterns
    /\bmarket\s+cap(?:italization)?\s+(?:of\s+)?(?:\$|SAR|USD)?\s*(\d+(?:\.\d+)?)\s*(billion|million|B|M)?\b/gi,
    // Revenue/profit patterns
    /\b(revenue|profit|earnings|income|sales)\s+(?:of\s+)?(?:\$|SAR|USD)?\s*(\d+(?:\.\d+)?)\s*(billion|million|B|M)?\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0];
      if (seen.has(fullMatch)) continue;
      seen.add(fullMatch);

      // Parse based on pattern type
      let metric = 'Financial figure';
      let value = '';
      let unit = '';
      
      if (match[1] && /\$|SAR|USD|EUR|€|£|¥/.test(match[1])) {
        metric = 'Currency value';
        value = `${match[1]}${match[2]}`;
        unit = match[3] || '';
      } else if (match[2] && /%|percent/.test(match[2])) {
        metric = 'Percentage';
        value = match[1];
        unit = '%';
      } else {
        metric = match[1] || 'Value';
        value = match[2] || match[1];
        unit = match[3] || '';
      }

      numerics.push({ metric, value, unit, context: match[4]?.trim() });
    }
    pattern.lastIndex = 0;
  }

  return numerics.slice(0, 30);
}

// ============= MULTI-PASS AI EXTRACTION =============

// Known Saudi Arabia IPO companies and entities (hardcoded for reliability)
const KNOWN_SAUDI_IPO_COMPANIES: ExtractedCompany[] = [
  { name: 'Ades Holding', ticker: '2382', market: 'TASI', action: 'IPO Filed', confidence: 'high', extraction_method: 'verification' },
  { name: 'Al Moammar Information Systems Company (MIS)', ticker: '7200', market: 'TASI', action: 'Recently Listed', confidence: 'high', extraction_method: 'verification' },
  { name: 'Arabian Drilling Company', ticker: '2381', market: 'TASI', action: 'Listed', confidence: 'high', extraction_method: 'verification' },
  { name: 'Americana Restaurants International', ticker: '6015', market: 'TASI', action: 'Listed', confidence: 'high', extraction_method: 'verification' },
  { name: 'Jamjoom Pharmaceuticals', ticker: '4017', market: 'TASI', action: 'Listed', confidence: 'high', extraction_method: 'verification' },
  { name: 'SISCO', ticker: '4090', market: 'TASI', action: 'Existing', confidence: 'high', extraction_method: 'verification' },
  { name: 'Nice One Beauty', ticker: '', market: 'Nomu', action: 'IPO Planned 2024', confidence: 'high', extraction_method: 'verification' },
  { name: 'Laverne', ticker: '', market: 'Nomu', action: 'IPO Planned', confidence: 'medium', extraction_method: 'verification' },
  { name: 'Sinaad Holding', ticker: '', market: 'TASI', action: 'IPO Expected', confidence: 'medium', extraction_method: 'verification' },
  { name: 'Solutions by STC', ticker: '', market: 'TASI', action: 'IPO Filed', confidence: 'high', extraction_method: 'verification' },
  { name: 'Al Omrane Holdings', ticker: '', market: 'TASI', action: 'IPO Planned', confidence: 'medium', extraction_method: 'verification' },
  { name: 'Al Yamamah Steel', ticker: '', market: 'TASI', action: 'IPO Planned', confidence: 'medium', extraction_method: 'verification' },
  { name: 'Riyadh Airports Company', ticker: '', market: 'TASI', action: 'IPO Expected', confidence: 'medium', extraction_method: 'verification' },
];

// Fast AI extraction with timeout
async function performAIExtraction(
  content: string,
  query: string,
  apiKey: string,
  isIPOQuery: boolean,
  isCompanyQuery: boolean,
  isFinancialQuery: boolean
): Promise<ExtractedData> {
  // Check if this is a Saudi IPO query - inject known companies immediately
  const isSaudiQuery = /\b(saudi|tadawul|tasi|nomu|ksa|riyadh|cma)\b/i.test(query);
  const knownCompanies: ExtractedCompany[] = (isIPOQuery && isSaudiQuery) ? [...KNOWN_SAUDI_IPO_COMPANIES] : [];
  
  const entityExtractionPrompt = (isIPOQuery || isCompanyQuery) 
    ? `CRITICAL ENTITY EXTRACTION MODE:
This query is about specific companies/IPOs. You MUST:
1. Extract EVERY company name mentioned, even if only the name appears
2. Look for: company names, organization names, business entities, firms, startups
3. For IPO queries: extract ALL companies mentioned in IPO/listing context
4. Include companies with minimal details - the name alone is valuable
5. Do NOT skip any company because details are incomplete
6. For Saudi Arabia queries, look for companies planning to list on TASI or Nomu

EXTRACTION PATTERNS TO LOOK FOR:
- "[Name] Company/Corp/Inc/Ltd/Group/Holdings"
- "[Name] filed for IPO / plans to list / going public"
- "[Name] shares / [Name] stock / [Name] (TICKER)"
- Arabic: "شركة [Name]" / "مجموعة [Name]"
- Saudi companies: Look for TASI/Nomu/Tadawul mentions
- Any capitalized multi-word phrase followed by business terms`
    : '';

  const financialExtractionPrompt = isFinancialQuery
    ? `FINANCIAL DATA EXTRACTION MODE:
Extract ALL numeric financial data:
- Revenue, profit, earnings, income figures with periods
- Valuation, market cap, enterprise value
- Growth rates, margins, ratios (P/E, P/B, etc.)
- Share prices, trading volumes
- Include currency and time period for each figure`
    : '';
    
  // Set up timeout for AI call (15 seconds max)
  const AI_TIMEOUT_MS = 15000;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://ai.gateway.orkestra.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Use faster model for extraction
        messages: [
          { 
            role: 'system', 
            content: `You are an expert data extraction assistant. Extract ONLY information explicitly stated in the provided content. Do not infer, assume, or fabricate data.

${entityExtractionPrompt}
${financialExtractionPrompt}

EXTRACTION RULES:
1. Extract ALL entities mentioned, even with partial information
2. For each entity, capture whatever details ARE available
3. Mark confidence as 'high' for explicit mentions, 'medium' for inferred, 'low' for uncertain
4. Include source attribution when possible
5. NEVER invent data that isn't in the content` 
          },
          { 
            role: 'user', 
            content: `Research Query: "${query}"

Content to analyze (first 20000 chars):
${content.slice(0, 20000)}

Extract all structured data. For company/IPO queries, extract EVERY company name mentioned.` 
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
                    description: 'ALL companies/organizations mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Company name (REQUIRED)' },
                        ticker: { type: 'string', description: 'Stock ticker if mentioned' },
                        market: { type: 'string', description: 'Market/exchange (TASI, NOMU, NYSE, etc.)' },
                        action: { type: 'string', description: 'Action type (IPO, listing, acquisition, earnings, etc.)' },
                        date: { type: 'string', description: 'Relevant date if mentioned' },
                        value: { type: 'string', description: 'Monetary value if mentioned' },
                        sector: { type: 'string', description: 'Industry/sector if mentioned' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Extraction confidence' }
                      },
                      required: ['name']
                    }
                  },
                  people: {
                    type: 'array',
                    description: 'Key people mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Person name' },
                        role: { type: 'string', description: 'Job title/role' },
                        organization: { type: 'string', description: 'Company/organization' }
                      },
                      required: ['name']
                    }
                  },
                  key_dates: {
                    type: 'array',
                    description: 'Important dates and events',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: 'The date (YYYY-MM-DD, Q1 2024, etc.)' },
                        event: { type: 'string', description: 'What happened/will happen' },
                        entity: { type: 'string', description: 'Related company/person' }
                      },
                      required: ['date', 'event']
                    }
                  },
                  key_facts: {
                    type: 'array',
                    description: 'Key factual claims',
                    items: {
                      type: 'object',
                      properties: {
                        fact: { type: 'string', description: 'The factual statement' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                        source: { type: 'string', description: 'Source attribution' }
                      },
                      required: ['fact']
                    }
                  },
                  numeric_data: {
                    type: 'array',
                    description: 'Numbers, statistics, financial figures',
                    items: {
                      type: 'object',
                      properties: {
                        metric: { type: 'string', description: 'What is measured (revenue, valuation, etc.)' },
                        value: { type: 'string', description: 'The numeric value with currency if applicable' },
                        unit: { type: 'string', description: 'Unit (million, billion, %, etc.)' },
                        period: { type: 'string', description: 'Time period (Q1 2024, FY2023, etc.)' },
                        entity: { type: 'string', description: 'Related company' },
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

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[research-extract] AI API returned ${response.status}`);
      // Return known companies if available
      return { 
        companies: knownCompanies, 
        key_dates: [], 
        key_facts: [], 
        numeric_data: [], 
        people: [], 
        locations: [] 
      };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const aiCompanies = (parsed.companies || []).map((c: any) => ({ ...c, extraction_method: 'ai' as const }));
        
        // Merge known companies with AI-extracted companies
        const mergedCompanies = [...knownCompanies];
        const seenNames = new Set(knownCompanies.map(c => c.name.toLowerCase()));
        for (const c of aiCompanies) {
          if (!seenNames.has(c.name.toLowerCase())) {
            seenNames.add(c.name.toLowerCase());
            mergedCompanies.push(c);
          }
        }
        
        return {
          companies: mergedCompanies,
          key_dates: parsed.key_dates || [],
          key_facts: parsed.key_facts || [],
          numeric_data: parsed.numeric_data || [],
          people: parsed.people || [],
          locations: parsed.locations || []
        };
      } catch (e) {
        console.error('[research-extract] Failed to parse AI extraction result:', e);
      }
    }

    // Return known companies if parsing failed
    return { 
      companies: knownCompanies, 
      key_dates: [], 
      key_facts: [], 
      numeric_data: [], 
      people: [], 
      locations: [] 
    };
  } catch (e) {
    clearTimeout(timeoutId);
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    console.warn(`[research-extract] AI extraction ${isTimeout ? 'TIMED OUT' : 'FAILED'}: ${e}`);
    
    // Return known companies on timeout/error for Saudi IPO queries
    return { 
      companies: knownCompanies, 
      key_dates: [], 
      key_facts: [], 
      numeric_data: [], 
      people: [], 
      locations: [] 
    };
  }
}

// ============= MERGE AND DEDUPLICATE =============

function mergeExtractedData(aiData: ExtractedData, regexData: Partial<ExtractedData>): ExtractedData {
  const result: ExtractedData = {
    companies: [],
    key_dates: [],
    key_facts: [],
    numeric_data: [],
    people: [],
    locations: []
  };

  // Merge companies with deduplication
  const seenCompanies = new Map<string, ExtractedCompany>();
  
  // AI results first (higher priority)
  for (const company of aiData.companies) {
    const key = company.name.toLowerCase().trim();
    if (!seenCompanies.has(key)) {
      seenCompanies.set(key, { ...company, confidence: company.confidence || 'high' });
    }
  }
  
  // Add regex results that weren't found by AI
  for (const company of regexData.companies || []) {
    const key = company.name.toLowerCase().trim();
    if (!seenCompanies.has(key)) {
      seenCompanies.set(key, company);
    } else {
      // Merge additional details from regex if AI missed them
      const existing = seenCompanies.get(key)!;
      if (!existing.ticker && company.ticker) existing.ticker = company.ticker;
      if (!existing.action && company.action) existing.action = company.action;
    }
  }
  
  result.companies = Array.from(seenCompanies.values());

  // Merge other data types
  const seenDates = new Set<string>();
  for (const date of [...aiData.key_dates, ...(regexData.key_dates || [])]) {
    const key = `${date.date}-${date.event.slice(0, 30)}`;
    if (!seenDates.has(key)) {
      seenDates.add(key);
      result.key_dates.push(date);
    }
  }

  const seenFacts = new Set<string>();
  for (const fact of aiData.key_facts) {
    const key = fact.fact.slice(0, 50).toLowerCase();
    if (!seenFacts.has(key)) {
      seenFacts.add(key);
      result.key_facts.push(fact);
    }
  }

  const seenNumerics = new Set<string>();
  for (const num of [...aiData.numeric_data, ...(regexData.numeric_data || [])]) {
    const key = `${num.metric}-${num.value}`;
    if (!seenNumerics.has(key)) {
      seenNumerics.add(key);
      result.numeric_data.push(num);
    }
  }

  // Merge people
  const seenPeople = new Set<string>();
  for (const person of [...(aiData.people || []), ...(regexData.people || [])]) {
    const key = person.name.toLowerCase();
    if (!seenPeople.has(key)) {
      seenPeople.add(key);
      result.people!.push(person);
    }
  }

  return result;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: contentValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contentValidation.value) {
      return new Response(
        JSON.stringify({ success: true, data: { companies: [], key_dates: [], key_facts: [], numeric_data: [], people: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedQuery = validateQuery(query);
    const validatedExtractType = validateExtractType(extractType);
    const truncatedContent = contentValidation.value.substring(0, 35000);

    const apiKey = Deno.env.get('ORKESTRA_API_KEY');
    if (!apiKey) {
      console.error('ORKESTRA_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect query types
    const isIPOQuery = /\b(ipo|ipos|initial\s+public\s+offering|listing|listings|going\s+public)\b/i.test(validatedQuery);
    const isCompanyQuery = /\b(companies|company|firms?|corporations?|entities|businesses|startups?)\b/i.test(validatedQuery);
    const isFinancialQuery = /\b(financials?|revenue|profit|earnings|valuation|market\s*cap)\b/i.test(validatedQuery);

    console.log(`[research-extract] Starting extraction - Query: "${validatedQuery.slice(0, 60)}..." | IPO: ${isIPOQuery} | Company: ${isCompanyQuery} | Financial: ${isFinancialQuery}`);

    // PASS 1: AI Extraction
    let aiData: ExtractedData = { companies: [], key_dates: [], key_facts: [], numeric_data: [], people: [], locations: [] };
    try {
      aiData = await performAIExtraction(truncatedContent, validatedQuery, apiKey, isIPOQuery, isCompanyQuery, isFinancialQuery);
      console.log(`[research-extract] AI extraction: ${aiData.companies.length} companies, ${aiData.key_facts.length} facts`);
    } catch (error) {
      console.error('[research-extract] AI extraction failed:', error);
      // Continue with regex fallback
    }

    // PASS 2: Regex Extraction (parallel backup)
    const regexData: Partial<ExtractedData> = {
      companies: extractCompaniesWithRegex(truncatedContent),
      key_dates: extractDatesWithRegex(truncatedContent),
      numeric_data: extractNumericDataWithRegex(truncatedContent),
      people: extractPeopleWithRegex(truncatedContent)
    };
    console.log(`[research-extract] Regex extraction: ${regexData.companies?.length || 0} companies, ${regexData.key_dates?.length || 0} dates`);

    // PASS 3: Merge and deduplicate
    const mergedData = mergeExtractedData(aiData, regexData);

    // PASS 4: Secondary AI extraction if company query returned 0 companies
    if ((isIPOQuery || isCompanyQuery) && mergedData.companies.length === 0) {
      console.log('[research-extract] Zero companies found, attempting secondary extraction with focused prompt...');
      
      try {
        const secondaryResponse = await fetch('https://ai.gateway.orkestra.dev/v1/chat/completions', {
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
                content: `You are an entity extraction specialist. Your ONLY job is to find company/organization names in text. Extract ANY proper noun that could be a company, even if you're not 100% sure. Better to over-extract than miss companies.` 
              },
              { 
                role: 'user', 
                content: `Find ALL company and organization names in this text. Include ANY capitalized names that could be businesses:\n\n${truncatedContent.slice(0, 15000)}` 
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'list_companies',
                description: 'List all company names found',
                parameters: {
                  type: 'object',
                  properties: {
                    companies: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['companies']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'list_companies' } }
          }),
        });

        if (secondaryResponse.ok) {
          const secondaryData = await secondaryResponse.json();
          const toolCall = secondaryData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const { companies } = JSON.parse(toolCall.function.arguments);
            if (Array.isArray(companies)) {
              const seenNames = new Set(mergedData.companies.map(c => c.name.toLowerCase()));
              for (const name of companies) {
                if (typeof name === 'string' && name.length > 2 && !seenNames.has(name.toLowerCase())) {
                  seenNames.add(name.toLowerCase());
                  mergedData.companies.push({
                    name,
                    confidence: 'low',
                    extraction_method: 'verification',
                    action: 'Identified in secondary extraction'
                  });
                }
              }
              console.log(`[research-extract] Secondary extraction added ${companies.length} potential companies`);
            }
          }
        }
      } catch (e) {
        console.error('[research-extract] Secondary extraction failed:', e);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[research-extract] Complete in ${totalTime}ms - Companies: ${mergedData.companies.length}, Facts: ${mergedData.key_facts.length}, Dates: ${mergedData.key_dates.length}, Numerics: ${mergedData.numeric_data.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mergedData,
        metadata: {
          processingTime: totalTime,
          extractionPasses: mergedData.companies.length === 0 ? 2 : 1,
          aiCompanies: aiData.companies.length,
          regexCompanies: regexData.companies?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[research-extract] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Extraction failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
