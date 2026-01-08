import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================
// MANUS 1.7 MAX - CENTRAL COMMAND ROUTER
// ============================================
// Intelligently routes queries to appropriate sub-agents
// Detects query intent and spawns parallel tool execution

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Query Intent Types
type QueryIntent = 
  | 'url_scrape'
  | 'profile_lookup'
  | 'company_research'
  | 'lead_enrichment'
  | 'news_search'
  | 'deep_research'
  | 'general_research';

interface QueryAnalysis {
  intent: QueryIntent;
  confidence: number;
  extractedUrls: string[];
  extractedNames: string[];
  extractedCompanies: string[];
  keywords: string[];
  suggestedAgents: string[];
}

interface RouteResult {
  analysis: QueryAnalysis;
  results: any[];
  sources: string[];
  executionTimeMs: number;
}

// URL pattern detection
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const LINKEDIN_PATTERN = /linkedin\.com\/(in|company)\/[\w-]+/i;
const TWITTER_PATTERN = /twitter\.com\/[\w]+|x\.com\/[\w]+/i;

// Profile query patterns
const PROFILE_PATTERNS = [
  /\b(who is|about|profile|biography|background|career)\b/i,
  /\b(CEO|CFO|COO|chairman|director|founder|executive)\s+(of|at)\b/i,
  /linkedin\.com\/in\//i,
  /\b(person|individual|leader|manager)\b.*\b(information|details|summary)\b/i,
];

// Company query patterns
const COMPANY_PATTERNS = [
  /\b(company|corporation|inc|ltd|llc|plc|about company|company profile)\b/i,
  /\b(business|enterprise|organization|firm)\s+(information|details|overview)\b/i,
  /linkedin\.com\/company\//i,
  /\b(sector|industry|market)\s+(analysis|research)\b/i,
];

// Lead enrichment patterns
const LEAD_PATTERNS = [
  /\b(find|search|lookup|enrich|discover)\b.*\b(contact|email|phone)\b/i,
  /\b(lead|prospect|contact)\s+(enrichment|data|information)\b/i,
  /\b(person|ceo|founder)\b.*\b(email|contact|details)\b/i,
];

// News patterns
const NEWS_PATTERNS = [
  /\b(latest|recent|breaking|today|news|announcement)\b/i,
  /\b(stock|market|trading|ipo|listing)\s+(news|update)\b/i,
  /\b(cma|regulation|violation|fine|approval)\b/i,
];

// Analyze query intent
function analyzeQuery(query: string): QueryAnalysis {
  const queryLower = query.toLowerCase();
  const extractedUrls = query.match(URL_PATTERN) || [];
  
  // Extract names (simple heuristic - capitalized words)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const extractedNames = (query.match(namePattern) || []).filter(name => 
    !['The', 'What', 'How', 'Why', 'When', 'Where', 'Which'].some(w => name.startsWith(w))
  );
  
  // Extract company-like terms
  const companyPattern = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(Inc|Corp|Ltd|LLC|PLC|Co|Company|Group|Holdings)\b/gi;
  const extractedCompanies = query.match(companyPattern) || [];
  
  // Detect intent with confidence
  let intent: QueryIntent = 'general_research';
  let confidence = 0.5;
  const suggestedAgents: string[] = [];
  
  // URL detected - route to scraping
  if (extractedUrls.length > 0) {
    intent = 'url_scrape';
    confidence = 0.95;
    suggestedAgents.push('ai-scrape-command', 'crawl4ai');
    
    // Check if it's a profile URL
    if (LINKEDIN_PATTERN.test(query) || TWITTER_PATTERN.test(query)) {
      intent = 'profile_lookup';
      suggestedAgents.push('lead-enrichment');
    }
  }
  // Profile lookup
  else if (PROFILE_PATTERNS.some(p => p.test(query))) {
    intent = 'profile_lookup';
    confidence = 0.85;
    suggestedAgents.push('lead-enrichment', 'ai-scrape-command', 'wide-research');
  }
  // Lead enrichment
  else if (LEAD_PATTERNS.some(p => p.test(query))) {
    intent = 'lead_enrichment';
    confidence = 0.9;
    suggestedAgents.push('lead-enrichment', 'explorium-enrich');
  }
  // Company research
  else if (COMPANY_PATTERNS.some(p => p.test(query)) || extractedCompanies.length > 0) {
    intent = 'company_research';
    confidence = 0.85;
    suggestedAgents.push('wide-research', 'explorium-enrich', 'gpt-researcher');
  }
  // News search
  else if (NEWS_PATTERNS.some(p => p.test(query))) {
    intent = 'news_search';
    confidence = 0.8;
    suggestedAgents.push('news-search', 'wide-research');
  }
  // Deep research for complex queries
  else if (query.length > 100 || query.includes('comprehensive') || query.includes('analysis')) {
    intent = 'deep_research';
    confidence = 0.75;
    suggestedAgents.push('gpt-researcher', 'research-orchestrator', 'wide-research');
  }
  // Default to general research
  else {
    suggestedAgents.push('wide-research', 'research-search');
  }
  
  // Extract keywords
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'what', 'who', 'which', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'];
  const keywords = queryLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 10);
  
  return {
    intent,
    confidence,
    extractedUrls,
    extractedNames,
    extractedCompanies,
    keywords,
    suggestedAgents,
  };
}

// Execute URL scraping with AI summary
async function executeScrape(url: string, query: string): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-scrape-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ 
        url, 
        command: query || 'Extract a comprehensive profile summary including background, experience, and key information.' 
      }),
    });
    
    if (!response.ok) throw new Error(`Scrape failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Router] Scrape error:', error);
    return null;
  }
}

// Execute lead enrichment
async function executeLeadEnrichment(query: string, sourceUrls?: string[]): Promise<any> {
  try {
    // Detect if it's a person or company query
    const isCompany = COMPANY_PATTERNS.some(p => p.test(query));
    
    const response = await fetch(`${supabaseUrl}/functions/v1/lead-enrichment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ 
        query,
        type: isCompany ? 'company' : 'person',
        sourceUrls,
      }),
    });
    
    if (!response.ok) throw new Error(`Lead enrichment failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Router] Lead enrichment error:', error);
    return null;
  }
}

// Execute wide research
async function executeWideResearch(query: string, options: any = {}): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/wide-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ 
        query,
        maxResults: options.maxResults || 15,
        ...options,
      }),
    });
    
    if (!response.ok) throw new Error(`Wide research failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Router] Wide research error:', error);
    return null;
  }
}

// Execute GPT Researcher for deep research
async function executeDeepResearch(query: string): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/gpt-researcher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) throw new Error(`Deep research failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Router] Deep research error:', error);
    return null;
  }
}

// Execute news search
async function executeNewsSearch(query: string, options: any = {}): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/news-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ 
        query,
        categories: options.categories,
        countries: options.countries,
        maxResults: options.maxResults || 20,
      }),
    });
    
    if (!response.ok) {
      // Fallback to wide-research in news mode
      return executeWideResearch(query, { newsMode: true });
    }
    return await response.json();
  } catch (error) {
    console.error('[Router] News search error:', error);
    return null;
  }
}

// Route and execute query
async function routeAndExecute(query: string, options: any = {}): Promise<RouteResult> {
  const startTime = Date.now();
  const analysis = analyzeQuery(query);
  const results: any[] = [];
  const sources: string[] = [];
  
  console.log(`[Router] Query intent: ${analysis.intent} (${(analysis.confidence * 100).toFixed(0)}%)`);
  console.log(`[Router] Suggested agents:`, analysis.suggestedAgents);
  
  // Execute based on intent - parallel where possible
  const promises: Promise<any>[] = [];
  
  switch (analysis.intent) {
    case 'url_scrape':
      // Scrape all URLs in parallel
      for (const url of analysis.extractedUrls.slice(0, 5)) {
        promises.push(
          executeScrape(url, query).then(r => {
            if (r) {
              results.push({ type: 'scrape', url, data: r });
              sources.push('ai-scrape-command');
            }
          })
        );
      }
      // Also run lead enrichment if URLs contain profile links
      if (LINKEDIN_PATTERN.test(query) || TWITTER_PATTERN.test(query)) {
        promises.push(
          executeLeadEnrichment(query, analysis.extractedUrls).then(r => {
            if (r) {
              results.push({ type: 'enrichment', data: r });
              sources.push('lead-enrichment');
            }
          })
        );
      }
      break;
      
    case 'profile_lookup':
      // Lead enrichment + wide research in parallel
      promises.push(
        executeLeadEnrichment(query, analysis.extractedUrls).then(r => {
          if (r) {
            results.push({ type: 'profile', data: r });
            sources.push('lead-enrichment');
          }
        })
      );
      promises.push(
        executeWideResearch(`${query} biography career background`, { maxResults: 10 }).then(r => {
          if (r?.searchResults) {
            results.push({ type: 'research', data: r.searchResults });
            sources.push('wide-research');
          }
        })
      );
      break;
      
    case 'lead_enrichment':
      promises.push(
        executeLeadEnrichment(query, options.sourceUrls).then(r => {
          if (r) {
            results.push({ type: 'lead', data: r });
            sources.push('lead-enrichment');
          }
        })
      );
      break;
      
    case 'company_research':
      // Wide research + optional GPT researcher in parallel
      promises.push(
        executeWideResearch(`${query} company profile financial overview`, { maxResults: 15 }).then(r => {
          if (r?.searchResults) {
            results.push({ type: 'company_research', data: r.searchResults });
            sources.push('wide-research');
          }
        })
      );
      if (query.length > 50) {
        promises.push(
          executeDeepResearch(query).then(r => {
            if (r) {
              results.push({ type: 'deep_research', data: r });
              sources.push('gpt-researcher');
            }
          })
        );
      }
      break;
      
    case 'news_search':
      promises.push(
        executeNewsSearch(query, options).then(r => {
          if (r?.news || r?.searchResults) {
            results.push({ type: 'news', data: r.news || r.searchResults });
            sources.push('news-search');
          }
        })
      );
      break;
      
    case 'deep_research':
      // GPT Researcher + wide research
      promises.push(
        executeDeepResearch(query).then(r => {
          if (r) {
            results.push({ type: 'deep_research', data: r });
            sources.push('gpt-researcher');
          }
        })
      );
      promises.push(
        executeWideResearch(query, { maxResults: 10 }).then(r => {
          if (r?.searchResults) {
            results.push({ type: 'supporting_research', data: r.searchResults });
            sources.push('wide-research');
          }
        })
      );
      break;
      
    case 'general_research':
    default:
      promises.push(
        executeWideResearch(query, { maxResults: 15 }).then(r => {
          if (r?.searchResults) {
            results.push({ type: 'general', data: r.searchResults });
            sources.push('wide-research');
          }
        })
      );
      break;
  }
  
  // Wait for all parallel executions
  await Promise.allSettled(promises);
  
  return {
    analysis,
    results,
    sources: [...new Set(sources)],
    executionTimeMs: Date.now() - startTime,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, options = {} } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[CommandRouter] Processing: "${query.substring(0, 100)}..."`);
    
    const result = await routeAndExecute(query, options);
    
    console.log(`[CommandRouter] Completed in ${result.executionTimeMs}ms, ${result.results.length} result sets from ${result.sources.join(', ')}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[CommandRouter] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
