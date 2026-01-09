import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TYPES ============
interface WideResearchRequest {
  query: string;
  items?: string[];
  maxResults?: number;
  newsMode?: boolean;
  deepResearch?: boolean; // Enable GPT-Researcher with parallel agents & fact verification
  config?: {
    maxSubAgents?: number;
    scrapeDepth?: 'shallow' | 'medium' | 'deep';
    minSourcesPerItem?: number;
    country?: string;
    includeFactVerification?: boolean;
    reportType?: 'research_report' | 'resource_report' | 'outline_report';
  };
  // LLM config from UI
  preferLocal?: boolean;
  endpointOverrides?: {
    ollamaUrl?: string;
    vllmUrl?: string;
    hfTgiUrl?: string;
  };
  // Priority sources - user-selected sources to prioritize
  prioritySources?: string[];
  // Data source ID from connector
  dataSourceId?: string;
}

// Priority source URLs from DATA_SOURCE_CONNECTORS
const PRIORITY_SOURCE_URLS: Record<string, { url: string; name: string }> = {
  // Official/Government Sources
  'cma': { url: 'https://cma.org.sa', name: 'CMA Saudi' },
  'tadawul': { url: 'https://www.saudiexchange.sa', name: 'Saudi Exchange' },
  'sec': { url: 'https://www.sec.gov', name: 'SEC EDGAR' },
  // Saudi/Regional News
  'argaam': { url: 'https://www.argaam.com', name: 'Argaam' },
  'mubasher': { url: 'https://www.mubasher.info', name: 'Mubasher' },
  'aleqt': { url: 'https://www.aleqt.com', name: 'Al Eqtisadiah' },
  'asharq': { url: 'https://asharqbusiness.com', name: 'Asharq Business' },
  'arabnews': { url: 'https://www.arabnews.com', name: 'Arab News' },
  'saudigazette': { url: 'https://saudigazette.com.sa', name: 'Saudi Gazette' },
  // Premium Global News
  'reuters': { url: 'https://www.reuters.com', name: 'Reuters' },
  'bloomberg': { url: 'https://www.bloomberg.com', name: 'Bloomberg' },
  'ft': { url: 'https://www.ft.com', name: 'Financial Times' },
  // Financial Data Providers
  'yahoo': { url: 'https://finance.yahoo.com', name: 'Yahoo Finance' },
  'tradingview': { url: 'https://www.tradingview.com', name: 'TradingView' },
  'marketscreener': { url: 'https://www.marketscreener.com', name: 'MarketScreener' },
  'marketwatch': { url: 'https://www.marketwatch.com', name: 'MarketWatch' },
  'simplywall': { url: 'https://simplywall.st', name: 'Simply Wall St' },
  'investing': { url: 'https://www.investing.com', name: 'Investing.com' },
  'seekingalpha': { url: 'https://seekingalpha.com', name: 'Seeking Alpha' },
  'morningstar': { url: 'https://www.morningstar.com', name: 'Morningstar' },
  'zacks': { url: 'https://www.zacks.com', name: 'Zacks' },
  'koyfin': { url: 'https://www.koyfin.com', name: 'Koyfin' },
  'stockanalysis': { url: 'https://stockanalysis.com', name: 'StockAnalysis' },
  'tradingeconomics': { url: 'https://tradingeconomics.com', name: 'Trading Economics' },
};

interface VerifiedFact {
  claim: string;
  verified: boolean;
  sources: string[];
  confidence: number;
}

interface WebSource {
  url: string;
  title: string;
  domain: string;
  content: string;
  markdown: string;
  fetchedAt: string;
  reliability: number;
  source: string;
  relevanceScore?: number;
  status?: 'pending' | 'scraped' | 'failed';
  snippet?: string;
}

// ============ CONFIGURATION ============
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_000_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// ============ MULTI-AGENT RESEARCH ENGINE (USES BUILT-IN AGENTS) ============
// Uses: web-search → playwright-browser → LLM synthesis
// This performs REAL web searches and scrapes REAL content

function getSupabaseConfig() {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  };
}

// Step 1: Use web-search agent to find real sources
async function searchWithWebAgent(
  query: string, 
  maxResults: number = 10,
  prioritySources?: string[],
  dataSourceId?: string
): Promise<WebSource[]> {
  const { url, key } = getSupabaseConfig();
  
  if (!url || !key) {
    console.error('[wide-research] No Supabase config for web-search');
    return [];
  }
  
  console.log(`[wide-research] Calling web-search agent for: "${query.slice(0, 60)}..."`, {
    prioritySources: prioritySources?.length || 0,
    dataSourceId,
  });
  
  try {
    const response = await fetch(`${url}/functions/v1/web-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        maxResults,
        searchEngine: 'all', // Use all search engines
        scrapeContent: true, // Scrape content directly
        prioritySources, // Pass priority sources to prioritize
        dataSourceId, // Pass selected data source
      }),
    });
    
    if (!response.ok) {
      console.error('[wide-research] web-search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    // web-search returns data in 'data' array, not 'results'
    const results = data.data || data.results || [];
    
    console.log(`[wide-research] web-search returned ${results.length} results`);
    
    return results.map((r: any) => {
      let domain = 'unknown';
      try {
        domain = r.domain || (r.url ? new URL(r.url).hostname.replace('www.', '') : 'unknown');
      } catch {}
      
      return {
        url: r.url,
        title: r.title || 'Untitled',
        domain,
        content: r.markdown || r.description || '',
        markdown: r.markdown || r.description || '',
        snippet: (r.description || r.markdown || '').slice(0, 280),
        fetchedAt: r.fetchedAt || new Date().toISOString(),
        reliability: 0.8,
        source: r.source || 'web-search',
        relevanceScore: 0.75,
        status: r.markdown && r.markdown.length > 100 ? 'scraped' as const : 'pending' as const,
      };
    });
  } catch (error) {
    console.error('[wide-research] web-search error:', error);
    return [];
  }
}

// Step 2: Use playwright-browser agent to extract full content
async function scrapeWithPlaywright(url: string): Promise<{ content: string; markdown: string; title?: string }> {
  const { url: supabaseUrl, key } = getSupabaseConfig();
  
  if (!supabaseUrl || !key) {
    return { content: '', markdown: '' };
  }
  
  console.log(`[wide-research] Scraping with playwright: ${url.slice(0, 60)}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/playwright-browser`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        action: 'scrape',
        waitTime: 3000,
      }),
    });
    
    if (!response.ok) {
      console.log(`[wide-research] playwright scrape failed for ${url}:`, response.status);
      return { content: '', markdown: '' };
    }
    
    const data = await response.json();
    
    if (data.success) {
      return {
        content: data.content || '',
        markdown: data.markdown || data.content || '',
        title: data.title,
      };
    }
    
    return { content: '', markdown: '' };
  } catch (error) {
    console.error(`[wide-research] playwright error for ${url}:`, error);
    return { content: '', markdown: '' };
  }
}

// Step 3: Use LLM to synthesize answer from REAL scraped content
async function synthesizeAnswer(
  query: string, 
  sources: WebSource[]
): Promise<{ answer: string; confidence: string }> {
  const apiKey = Deno.env.get('ORKESTRA_API_KEY');
  
  if (!apiKey || sources.length === 0) {
    return { answer: '', confidence: 'low' };
  }
  
  // Prepare source content for synthesis
  const sourceContext = sources
    .filter(s => s.content && s.content.length > 50)
    .slice(0, 8)
    .map((s, i) => `[Source ${i + 1}: ${s.domain}]\n${s.title}\n${s.content.slice(0, 2000)}`)
    .join('\n\n---\n\n');
  
  if (!sourceContext) {
    return { answer: '', confidence: 'low' };
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are MANUS 1.6 MAX research synthesis engine. Your job is to analyze REAL source content and provide a direct answer to the user's query.

Current date: ${currentDate}

CRITICAL RULES:
1. ONLY use information from the provided sources - DO NOT make up information
2. Cite which source(s) support each fact using [Source N] notation
3. If the sources don't contain the answer, say "The sources do not contain specific information about..."
4. Answer the EXACT question asked - not a generic overview
5. Include specific dates, numbers, names, and facts FROM THE SOURCES
6. If sources contradict each other, note the discrepancy

RESPONSE FORMAT (JSON):
{
  "answer": "Direct answer based on source content with [Source N] citations",
  "keyFacts": ["Fact 1 with [Source N]", "Fact 2 with [Source N]"],
  "confidence": "high/medium/low",
  "sourcesCited": [1, 2, 3]
}`;

  const userPrompt = `USER QUERY: "${query}"

SOURCE CONTENT:
${sourceContext}

Analyze these sources and provide a direct answer to the query. Only use information from the sources.`;

  try {
    console.log('[wide-research] Synthesizing answer from real sources...');
    
    const response = await fetch('https://ai.gateway.orkestra.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('[wide-research] Synthesis LLM error:', response.status);
      return { answer: '', confidence: 'low' };
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON response
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      const parsed = JSON.parse(jsonStr);
      
      let fullAnswer = parsed.answer || '';
      if (parsed.keyFacts && parsed.keyFacts.length > 0) {
        fullAnswer += '\n\n**Key Facts:**\n' + parsed.keyFacts.map((f: string) => `• ${f}`).join('\n');
      }
      
      return { 
        answer: fullAnswer, 
        confidence: parsed.confidence || 'medium' 
      };
    } catch {
      // Return raw content if JSON parsing fails
      return { answer: content, confidence: 'medium' };
    }
  } catch (error) {
    console.error('[wide-research] Synthesis error:', error);
    return { answer: '', confidence: 'low' };
  }
}

// MAIN RESEARCH FUNCTION: Orchestrates multi-agent research
async function performMultiAgentResearch(
  query: string, 
  subQueries: string[],
  maxResults: number,
  prioritySources?: string[],
  dataSourceId?: string
): Promise<{ answer: string; sources: WebSource[] }> {
  console.log('[wide-research] Starting multi-agent research...', {
    prioritySources: prioritySources?.length || 0,
    dataSourceId,
  });
  
  // STEP 1: Search using web-search agent (parallel for all subqueries)
  const uniqueQueries = [...new Set([query, ...subQueries.slice(0, 3)])];
  const searchPromises = uniqueQueries.map(sq => 
    searchWithWebAgent(sq, Math.ceil(maxResults / uniqueQueries.length), prioritySources, dataSourceId)
  );
  const searchResultArrays = await Promise.all(searchPromises);
  
  // Combine and deduplicate results
  const allSearchResults: WebSource[] = [];
  const seenUrls = new Set<string>();
  
  for (const results of searchResultArrays) {
    for (const result of results) {
      if (result.url && !seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allSearchResults.push(result);
      }
    }
  }
  
  console.log(`[wide-research] Total unique search results: ${allSearchResults.length}`);
  
  if (allSearchResults.length === 0) {
    console.log('[wide-research] No search results, returning empty');
    return { answer: '', sources: [] };
  }
  
  // STEP 2: Scrape top results that don't have content yet
  const needsScraping = allSearchResults.filter(s => s.status !== 'scraped' || !s.content || s.content.length < 100);
  const alreadyScraped = allSearchResults.filter(s => s.status === 'scraped' && s.content && s.content.length >= 100);
  
  const topToScrape = needsScraping.slice(0, 4);
  
  if (topToScrape.length > 0) {
    console.log(`[wide-research] Scraping ${topToScrape.length} sources with playwright...`);
    const scrapePromises = topToScrape.map(async (source) => {
      const scraped = await scrapeWithPlaywright(source.url);
      if (scraped.content && scraped.content.length > 100) {
        return {
          ...source,
          content: scraped.content.slice(0, 8000),
          markdown: scraped.markdown.slice(0, 8000),
          title: scraped.title || source.title,
          status: 'scraped' as const,
          relevanceScore: 0.85,
        };
      }
      return source;
    });
    
    const newlyScraped = await Promise.all(scrapePromises);
    alreadyScraped.push(...newlyScraped.filter(s => s.status === 'scraped'));
  }
  
  const scrapedSources = alreadyScraped.slice(0, maxResults);
  
  // Count how many were successfully scraped
  const successfulScrapes = scrapedSources.filter(s => s.content && s.content.length > 100).length;
  console.log(`[wide-research] Successfully have ${successfulScrapes} sources with content`);
  
  // STEP 3: Synthesize answer from scraped content
  const { answer, confidence } = await synthesizeAnswer(query, scrapedSources);
  
  // Add synthesis result as first source
  const finalSources: WebSource[] = [];
  
  if (answer) {
    finalSources.push({
      url: 'manus://research-synthesis',
      title: `Research Synthesis: ${query.slice(0, 50)}...`,
      domain: 'manus.research',
      content: answer,
      markdown: answer,
      snippet: answer.slice(0, 280),
      fetchedAt: new Date().toISOString(),
      reliability: confidence === 'high' ? 0.95 : confidence === 'medium' ? 0.8 : 0.65,
      source: 'MANUS Multi-Agent Research',
      relevanceScore: 0.98,
      status: 'scraped' as const,
    });
  }
  
  // Add scraped sources (filter out synthesis)
  finalSources.push(...scrapedSources.filter(s => s.url !== 'manus://research-synthesis').slice(0, maxResults - 1));
  
  console.log(`[wide-research] Research complete with ${finalSources.length} sources`);
  
  return { answer, sources: finalSources };
}

// ============ GPT-RESEARCHER DEEP RESEARCH MODE ============
// Uses parallel sub-agents: Planner → Searcher → Scraper → Analyzer → Verifier → Writer
async function performDeepResearch(
  query: string,
  config: WideResearchRequest['config']
): Promise<{ 
  report: string; 
  sources: WebSource[]; 
  verifiedFacts: VerifiedFact[];
  metadata: { totalAgents: number; queriesExecuted: number; llmProvider: string }
}> {
  const { url, key } = getSupabaseConfig();
  
  console.log('[wide-research] Starting GPT-Researcher deep research...');
  
  try {
    // Call the GPT-Researcher edge function with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout
    
    const response = await fetch(`${url}/functions/v1/gpt-researcher`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        reportType: config?.reportType || 'research_report',
        maxSources: 12,
        parallelAgents: config?.maxSubAgents || 4,
        includeFactVerification: config?.includeFactVerification !== false,
        outputFormat: 'markdown',
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error('[wide-research] GPT-Researcher call failed:', response.status);
      return { 
        report: '', 
        sources: [], 
        verifiedFacts: [],
        metadata: { totalAgents: 0, queriesExecuted: 0, llmProvider: 'none' }
      };
    }
    
    const data = await response.json();
    
    // Check for error response
    if (data.error) {
      console.error('[wide-research] GPT-Researcher returned error:', data.error);
      return { 
        report: '', 
        sources: [], 
        verifiedFacts: [],
        metadata: { totalAgents: 0, queriesExecuted: 0, llmProvider: 'error' }
      };
    }
    
    console.log(`[wide-research] GPT-Researcher completed:`, {
      hasReport: !!data.report,
      reportLength: data.report?.length || 0,
      sources: data.sources?.length || 0,
      facts: data.factsVerified?.length || 0,
      agents: data.metadata?.totalAgents || 0,
    });
    
    // Transform GPT-Researcher sources to WebSource format
    const sources: WebSource[] = (data.sources || []).map((s: any) => ({
      url: s.url || '',
      title: s.title || 'Untitled',
      domain: s.domain || (s.url ? new URL(s.url).hostname.replace('www.', '') : 'unknown'),
      content: s.extractedContent || '',
      markdown: s.extractedContent || '',
      snippet: (s.extractedContent || '').slice(0, 280),
      fetchedAt: new Date().toISOString(),
      reliability: s.relevanceScore || 0.8,
      source: 'GPT-Researcher',
      relevanceScore: s.relevanceScore || 0.8,
      status: 'scraped' as const,
    }));
    
    // Add the report as the primary source
    if (data.report && data.report.length > 50) {
      sources.unshift({
        url: 'manus://gpt-researcher-report',
        title: `Deep Research Report: ${query.slice(0, 50)}...`,
        domain: 'manus.gpt-researcher',
        content: data.report,
        markdown: data.report,
        snippet: data.report.slice(0, 280),
        fetchedAt: new Date().toISOString(),
        reliability: 0.95,
        source: 'GPT-Researcher Multi-Agent',
        relevanceScore: 0.99,
        status: 'scraped' as const,
      });
    }
    
    return {
      report: data.report || '',
      sources,
      verifiedFacts: data.factsVerified || [],
      metadata: data.metadata || { totalAgents: 6, queriesExecuted: 5, llmProvider: 'LLM Router' },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[wide-research] GPT-Researcher error:', errorMsg);
    return { 
      report: '', 
      sources: [], 
      verifiedFacts: [],
      metadata: { totalAgents: 0, queriesExecuted: 0, llmProvider: 'error' }
    };
  }
}

// ============ FALLBACK: DIRECT HTML SCRAPING ============
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    if (!resp.ok) {
      return { ok: false, status: resp.status, text: '', error: `HTTP ${resp.status}` };
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const text = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status: resp.status, text };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, status: 0, text: '', error: error.includes('abort') ? 'Timeout' : error };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveFinalUrl(url: string, timeoutMs = 8_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    // We only need the final resolved URL; cancel body download.
    try {
      resp.body?.cancel();
    } catch {
      // ignore
    }

    return resp.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

// ============ REAL NEWS (RSS) ============
function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDateOrNow(s?: string | null): string {
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

// Regex-based XML parsing (DOMParser doesn't support text/xml in Deno)
function parseRssItems(xmlText: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  sourceUrl: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
    source: string;
    sourceUrl: string;
  }> = [];

  // Match all <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const itemContent = itemMatch[1];

    // Extract fields using regex
    const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(itemContent);
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
    const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(itemContent);
    const sourceMatch = /<source[^>]*(?:url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i.exec(itemContent);

    const title = titleMatch ? stripHtml(titleMatch[1]).trim() : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const description = descMatch ? stripHtml(descMatch[1]).trim() : '';
    const sourceUrl = sourceMatch?.[1] || '';
    const source = sourceMatch ? stripHtml(sourceMatch[2]).trim() : '';

    if (title && link && link.startsWith('http')) {
      items.push({ title, link, pubDate, description, source, sourceUrl });
    }
  }

  return items;
}

async function searchNewsRss(query: string, limit: number = 10): Promise<WebSource[]> {
  // NOTE: RSS feeds return REAL headlines/links; we do NOT generate news with an LLM.
  const rssUrls = [
    // Google News RSS - reliable source for real headlines
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    // Regional business feeds - GCC focused
    `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' Saudi Arabia')}&hl=en-US&gl=US&ceid=US:en`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' Gulf GCC')}&hl=en-US&gl=US&ceid=US:en`,
  ];

  console.log('[wide-research] RSS search:', { query: query.slice(0, 80), rssUrlsCount: rssUrls.length });

  const responses = await Promise.all(
    rssUrls.map((u) => fetchWithTimeout(u, 10_000))
  );

  const out: WebSource[] = [];

  for (let i = 0; i < responses.length; i++) {
    const resp = responses[i];
    const rssUrl = rssUrls[i];
    if (!resp.ok) {
      console.log('[wide-research] RSS fetch failed:', { rssUrl, status: resp.status, error: resp.error });
      continue;
    }

    // Parse RSS using regex (DOMParser doesn't support text/xml in edge runtime)
    const items = parseRssItems(resp.text);
    console.log(`[wide-research] Parsed ${items.length} items from RSS feed`);

    for (const item of items) {
      if (out.length >= limit) break;

      const titleRaw = item.title;
      const link = item.link;
      const pubDateRaw = item.pubDate;
      const descriptionRaw = item.description;
      const sourceName = item.source;
      const sourceUrl = item.sourceUrl;

      if (!titleRaw || !link || !link.startsWith('http')) continue;

      // Google News titles often come as: "Headline - Source"
      let title = titleRaw;
      let inferredSource = sourceName;
      if (!sourceName && titleRaw.includes(' - ')) {
        const parts = titleRaw.split(' - ');
        if (parts.length >= 2) {
          inferredSource = parts[parts.length - 1].trim();
          title = parts.slice(0, -1).join(' - ').trim();
        }
      } else if (sourceName && titleRaw.endsWith(` - ${sourceName}`)) {
        title = titleRaw.slice(0, titleRaw.length - (` - ${sourceName}`).length).trim();
      }

      const snippet = stripHtml(descriptionRaw).slice(0, 280);

      // Resolve Google News RSS redirect to the real publisher URL
      let actualUrl = link;
      try {
        const host = new URL(link).hostname;
        if (host.includes('news.google.com')) {
          actualUrl = await resolveFinalUrl(link);
        }
      } catch {
        // ignore
      }

      // Prefer resolved URL domain; fall back to RSS sourceUrl domain
      let domain = 'news.google.com';
      try {
        domain = new URL(actualUrl).hostname.replace('www.', '');
      } catch {
        if (sourceUrl) {
          try {
            domain = new URL(sourceUrl).hostname.replace('www.', '');
          } catch {
            // ignore
          }
        }
      }

      out.push({
        url: actualUrl,
        title,
        domain,
        content: snippet,
        markdown: snippet,
        snippet,
        fetchedAt: toIsoDateOrNow(pubDateRaw),
        reliability: 0.9,
        source: inferredSource || domain,
        relevanceScore: 0.75 + Math.random() * 0.2,
        status: 'scraped',
      });
    }

    if (out.length >= limit) break;
  }

  console.log('[wide-research] RSS results:', { count: out.length });
  return out;
}

// Fallback DuckDuckGo search (may not work due to bot blocking)
async function searchDuckDuckGoFallback(query: string): Promise<WebSource[]> {
  const results: WebSource[] = [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}&df=w`;
    
    console.log(`[wide-research] DuckDuckGo fallback: "${query.slice(0, 40)}..."`);
    
    const response = await fetchWithTimeout(searchUrl);
    if (!response.ok) return results;

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return results;

    const resultElements = doc.querySelectorAll('.result');
    
    for (const el of resultElements) {
      if (results.length >= 8) break;
      
      const linkEl = el.querySelector('.result__a');
      const snippetEl = el.querySelector('.result__snippet');
      
      if (!linkEl) continue;
      
      let href = linkEl.getAttribute('href') || '';
      const title = linkEl.textContent?.trim() || '';
      const description = snippetEl?.textContent?.trim() || '';
      
      if (href.includes('uddg=')) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) {
          try { href = decodeURIComponent(match[1]); } catch {}
        }
      }
      
      if (!href.startsWith('http')) continue;
      
      let domain = 'unknown';
      try {
        domain = new URL(href).hostname.replace('www.', '');
      } catch { continue; }
      
      results.push({
        url: href,
        title,
        domain,
        content: description,
        markdown: description,
        snippet: description,
        source: 'duckduckgo',
        fetchedAt: new Date().toISOString(),
        reliability: 0.75,
        relevanceScore: 0.7 + Math.random() * 0.15,
        status: 'pending',
      });
    }
  } catch (e) {
    console.error('[wide-research] DuckDuckGo fallback error:', e);
  }

  console.log(`[wide-research] DuckDuckGo found ${results.length} results`);
  return results;
}

// ============ CONTENT SCRAPING ============
function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

async function scrapeContent(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, 10000);
    if (!response.ok) return '';

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return '';

    const removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 
      'aside', 'header', '.advertisement', '.ad', '.social', '.comment'
    ];
    
    for (const sel of removeSelectors) {
      try {
        doc.querySelectorAll(sel).forEach((n: any) => n.remove());
      } catch {}
    }

    const mainContent = 
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector('.content') ||
      doc.body;

    if (!mainContent) return '';

    const text = normalizeText(mainContent.textContent || '');
    return text.slice(0, 10000);
  } catch {
    return '';
  }
}

// ============ QUERY DECOMPOSITION ============
function decomposeQuery(query: string): string[] {
  const subQueries: string[] = [];
  const currentYear = new Date().getFullYear();
  
  // Always add the original query
  subQueries.push(`${query} ${currentYear}`);
  subQueries.push(query);
  
  // Extract entities for additional queries
  const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  const entities = new Set<string>();
  let match;
  while ((match = entityPattern.exec(query)) !== null) {
    if (match[1].length > 2 && !['The', 'And', 'For', 'With', 'From'].includes(match[1])) {
      entities.add(match[1]);
    }
  }
  
  const queryLower = query.toLowerCase();
  
  // IPO-specific queries
  if (/\b(ipo|listing|public|float)\b/i.test(queryLower)) {
    subQueries.push(`IPO announcements ${currentYear} latest`);
    if (/saudi|ksa|tadawul/i.test(queryLower)) {
      subQueries.push(`Saudi Arabia Tadawul IPO ${currentYear}`);
      subQueries.push(`CMA Saudi IPO approval ${currentYear}`);
    }
  }
  
  // Company-specific queries
  entities.forEach(entity => {
    if (entity.length > 3) {
      subQueries.push(`${entity} company profile overview`);
    }
  });
  
  return [...new Set(subQueries)].slice(0, 8);
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json() as WideResearchRequest;
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = body.query.trim();
    const isNewsMode = body.newsMode === true;
    const isDeepResearch = body.deepResearch === true;
    const maxResults = body.maxResults || 15;
    const prioritySources = body.prioritySources || [];
    const dataSourceId = body.dataSourceId;

    console.log('[wide-research] Starting:', { 
      query: query.slice(0, 80), 
      isNewsMode, 
      isDeepResearch,
      maxResults,
      prioritySources: prioritySources.length,
      dataSourceId,
    });

    const subQueries = body.items && body.items.length > 0 
      ? body.items 
      : decomposeQuery(query);

    let sources: WebSource[] = [];

    // DEEP RESEARCH MODE: Use GPT-Researcher with parallel agents & fact verification
    if (isDeepResearch) {
      console.log('[wide-research] Deep research mode: using GPT-Researcher...');
      
      const { report, sources: deepSources, verifiedFacts, metadata: deepMeta } = 
        await performDeepResearch(query, body.config);
      
      if (deepSources.length > 0) {
        const totalTime = Date.now() - startTime;
        console.log('[wide-research] GPT-Researcher complete:', { 
          totalSources: deepSources.length, 
          verifiedFacts: verifiedFacts.length,
          agents: deepMeta.totalAgents,
          time: totalTime 
        });

        return new Response(
          JSON.stringify({
            success: true,
            searchResults: deepSources.slice(0, maxResults),
            results: deepSources.slice(0, maxResults),
            directAnswer: report,
            verifiedFacts,
            metadata: {
              query,
              totalSources: deepSources.length,
              searchMethod: 'gpt-researcher-deep',
              processingTimeMs: totalTime,
              ...deepMeta,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If GPT-Researcher failed, fall through to standard research
      console.log('[wide-research] GPT-Researcher returned no results, falling back to standard research...');
    }

    // NEWS MODE: Fetch real headlines/links via RSS (no LLM-generated news)
    if (isNewsMode) {
      console.log('[wide-research] News mode: trying RSS sources...');

      const rssAll: WebSource[] = [];
      for (const sq of subQueries.slice(0, 3)) {
        const rssResults = await searchNewsRss(sq, Math.min(maxResults, 15));
        rssAll.push(...rssResults);
      }

      // Deduplicate
      const seen = new Set<string>();
      sources = rssAll.filter(s => {
        if (seen.has(s.url)) return false;
        seen.add(s.url);
        return true;
      }).slice(0, maxResults);

      if (sources.length > 0) {
        const totalTime = Date.now() - startTime;
        console.log('[wide-research] News RSS complete:', { totalSources: sources.length, time: totalTime });

        return new Response(
          JSON.stringify({
            success: true,
            searchResults: sources,
            results: sources,
            metadata: {
              query,
              totalSources: sources.length,
              searchMethod: 'google-news-rss',
              processingTimeMs: totalTime,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[wide-research] RSS empty, trying DuckDuckGo fallback...');
      const ddgAll: WebSource[] = [];
      for (const sq of subQueries.slice(0, 3)) {
        const results = await searchDuckDuckGoFallback(sq);
        ddgAll.push(...results);
      }

      const ddgSeen = new Set<string>();
      sources = ddgAll.filter(s => {
        if (ddgSeen.has(s.url)) return false;
        ddgSeen.add(s.url);
        return true;
      }).slice(0, maxResults);

      for (let i = 0; i < Math.min(sources.length, 5); i++) {
        const content = await scrapeContent(sources[i].url);
        if (content && content.length > 100) {
          sources[i].content = content;
          sources[i].markdown = content;
          sources[i].status = 'scraped';
          sources[i].relevanceScore = Math.min(0.95, (sources[i].relevanceScore || 0.7) + 0.1);
        }
      }

      const totalTime = Date.now() - startTime;

      console.log('[wide-research] News complete:', {
        totalSources: sources.length,
        searchMethod: sources.length > 0 ? 'duckduckgo-fallback' : 'none',
        time: totalTime,
      });

      return new Response(
        JSON.stringify({
          success: true,
          searchResults: sources,
          results: sources,
          metadata: {
            query,
            totalSources: sources.length,
            searchMethod: sources.length > 0 ? 'duckduckgo-fallback' : 'none',
            processingTimeMs: totalTime,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RESEARCH MODE: Use multi-agent research (web-search + playwright + synthesis)
    const { answer, sources: researchSources } = await performMultiAgentResearch(
      query, 
      subQueries, 
      maxResults, 
      prioritySources, 
      dataSourceId
    );
    
    if (researchSources.length > 0) {
      sources = researchSources;
      const totalTime = Date.now() - startTime;
      console.log('[wide-research] Multi-agent research complete:', { totalSources: sources.length, time: totalTime });

      return new Response(
        JSON.stringify({
          success: true,
          searchResults: sources,
          results: sources,
          directAnswer: answer,
          metadata: {
            query,
            totalSources: sources.length,
            searchMethod: 'multi-agent-research',
            processingTimeMs: totalTime,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[wide-research] Multi-agent search empty, trying DuckDuckGo fallback...');

    const allResults: WebSource[] = [];
    for (const sq of subQueries.slice(0, 3)) {
      const results = await searchDuckDuckGoFallback(sq);
      allResults.push(...results);
    }

    // Deduplicate
    const seen = new Set<string>();
    sources = allResults.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    }).slice(0, maxResults);

    // Scrape content for top results
    for (let i = 0; i < Math.min(sources.length, 5); i++) {
      const content = await scrapeContent(sources[i].url);
      if (content && content.length > 100) {
        sources[i].content = content;
        sources[i].markdown = content;
        sources[i].status = 'scraped';
        sources[i].relevanceScore = Math.min(0.95, (sources[i].relevanceScore || 0.7) + 0.1);
      }
    }

    const totalTime = Date.now() - startTime;

    console.log('[wide-research] Complete:', {
      totalSources: sources.length,
      searchMethod: sources.length > 0 ? 'duckduckgo-fallback' : 'none',
      time: totalTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        searchResults: sources,
        results: sources,
        metadata: {
          query,
          totalSources: sources.length,
          searchMethod: sources.length > 0 ? 'duckduckgo-fallback' : 'none',
          processingTimeMs: totalTime,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wide-research] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Research failed',
        searchResults: [],
        results: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

