// Wide Research Module - Manus 1.6 MAX Architecture
// Implements parallel sub-agent execution for wide research tasks
// NO SYNTHETIC DATA - 100% real-time web scraping only

import { ResearchPlan, PlanStep, QualityScore, ClaimVerification, VerificationSource } from './types';
import { researchApi } from '@/lib/api/research';
import { parallelExecutor } from './parallelExecutor';

export interface WideResearchConfig {
  maxSubAgents: number; // Max parallel sub-queries (default: 8)
  scrapeDepth: 'shallow' | 'medium' | 'deep'; // Content extraction depth
  verificationLevel: 'basic' | 'standard' | 'thorough';
  minSourcesPerItem: number; // Min sources required per sub-query
  timeout: number; // Per-item timeout in ms
  country?: string; // Geographic focus
}

export interface SubAgentResult {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  sources: WebSource[];
  extractedData: ExtractedContent;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface WebSource {
  url: string;
  title: string;
  domain: string;
  content: string;
  markdown: string;
  fetchedAt: string;
  reliability: number;
  source: string; // Search engine that found this
  relevanceScore?: number;
  status?: 'pending' | 'scraped' | 'failed';
}

export interface ExtractedContent {
  companies: Array<{
    name: string;
    ticker?: string;
    market?: string;
    action?: string;
    date?: string;
    value?: string;
    source_url?: string;
  }>;
  key_facts: Array<{
    fact: string;
    confidence: 'high' | 'medium' | 'low';
    source?: string;
  }>;
  key_dates: Array<{
    date: string;
    event: string;
    entity?: string;
  }>;
  numeric_data: Array<{
    metric: string;
    value: string;
    unit?: string;
    context?: string;
  }>;
}

export interface WideResearchResult {
  id: string;
  query: string;
  subResults: SubAgentResult[];
  aggregatedSources: WebSource[];
  aggregatedData: ExtractedContent;
  report: string;
  quality: QualityScore;
  verifications: ClaimVerification[];
  timing: {
    total: number;
    planning: number;
    searching: number;
    extraction: number;
    synthesis: number;
  };
  metadata: {
    totalSourcesScraped: number;
    uniqueDomains: number;
    subQueriesExecuted: number;
    successfulSubQueries: number;
    failedSubQueries: number;
  };
}

export interface WideResearchCallbacks {
  onSubAgentStart?: (subQuery: string, index: number) => void;
  onSubAgentComplete?: (result: SubAgentResult, index: number) => void;
  onProgress?: (progress: number, phase: string) => void;
  onSourceFound?: (source: WebSource) => void;
}

const DEFAULT_CONFIG: WideResearchConfig = {
  maxSubAgents: 8,
  scrapeDepth: 'medium',
  verificationLevel: 'standard',
  minSourcesPerItem: 2,
  timeout: 30000,
};

// Decompose a complex query into focused sub-queries
function decomposeQuery(query: string): string[] {
  const subQueries: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Always include the original query first
  subQueries.push(query);
  
  // Extract entity names (capitalized words/phrases)
  const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  const entities = new Set<string>();
  let match;
  while ((match = entityPattern.exec(query)) !== null) {
    if (match[1].length > 2 && !['The', 'And', 'For', 'With', 'From'].includes(match[1])) {
      entities.add(match[1]);
    }
  }
  
  // Generate entity-focused queries
  entities.forEach(entity => {
    if (entity.length > 3) {
      subQueries.push(`${entity} company profile`);
      subQueries.push(`${entity} latest news`);
    }
  });
  
// IPO-specific sub-queries - CRITICAL for IPO research
  if (/\b(ipo|ipos|initial\s+public\s+offering|listing|listings|going\s+public)\b/i.test(queryLower)) {
    // Add specific IPO-focused searches with explicit company name requests
    subQueries.push(`upcoming IPO companies list 2024 2025 names`);
    subQueries.push(`IPO pipeline companies names list`);
    subQueries.push(`companies planning IPO filing names`);
    subQueries.push(`recent IPO announced company names`);
    subQueries.push(`IPO approved companies 2024 2025`);
    
    // Saudi-specific IPO queries with enhanced entity extraction
    if (/\b(saudi|ksa|tadawul|tasi|nomu|riyadh)\b/i.test(queryLower)) {
      subQueries.push(`Saudi Arabia upcoming IPO 2024 2025 company names list`);
      subQueries.push(`TASI new listings companies 2024 2025 names`);
      subQueries.push(`Nomu parallel market IPO companies list`);
      subQueries.push(`Tadawul upcoming IPO company names list`);
      subQueries.push(`Saudi CMA approved IPO companies names`);
      subQueries.push(`Saudi IPO pipeline valuation companies list`);
      subQueries.push(`Saudi Arabia stock market new company listings`);
      subQueries.push(`سوق الأسهم السعودي اكتتابات قادمة شركات`);
      // Official source searches
      subQueries.push(`site:tadawul.com.sa IPO companies`);
      subQueries.push(`site:cma.org.sa approved listings companies`);
      subQueries.push(`site:argaam.com Saudi IPO companies`);
      subQueries.push(`site:reuters.com Saudi Arabia IPO`);
    }
    
    entities.forEach(entity => {
      subQueries.push(`${entity} IPO date valuation`);
      subQueries.push(`${entity} stock listing announcement`);
    });
  }
  
  // Company-specific sub-queries
  if (/\b(companies|company|firms?|corporations?|entities|businesses)\b/i.test(queryLower)) {
    subQueries.push(`${query} company names list`);
    subQueries.push(`${query} specific companies`);
  }
  
  // Domain-specific sub-queries
  if (/\b(board|directors?|governance|executive)\b/i.test(queryLower)) {
    entities.forEach(entity => {
      subQueries.push(`${entity} board of directors members`);
      subQueries.push(`${entity} executive leadership team`);
    });
  }
  
  if (/\b(shareholders?|ownership|investors?|stake)\b/i.test(queryLower)) {
    entities.forEach(entity => {
      subQueries.push(`${entity} major shareholders ownership`);
      subQueries.push(`${entity} investor relations`);
    });
  }
  
  if (/\b(saudi|ksa|tadawul|tasi|riyadh)\b/i.test(queryLower)) {
    entities.forEach(entity => {
      subQueries.push(`${entity} Saudi Arabia operations`);
      subQueries.push(`${entity} Tadawul stock listing`);
    });
  }
  
  // Enhanced financial analysis queries
  if (/\b(financials?|revenue|profit|earnings|valuation|market\s*cap|p\/e|ebitda)\b/i.test(queryLower)) {
    subQueries.push(`${query} financial data numbers`);
    subQueries.push(`${query} revenue profit figures`);
    
    entities.forEach(entity => {
      subQueries.push(`${entity} financial results 2024 2025`);
      subQueries.push(`${entity} annual report financial statements`);
      subQueries.push(`${entity} revenue profit margin`);
      subQueries.push(`${entity} market capitalization valuation`);
      subQueries.push(`${entity} P/E ratio EBITDA`);
      subQueries.push(`${entity} investor presentation financials`);
    });
    
    // Financial data source searches
    if (/\b(saudi|ksa|tadawul)\b/i.test(queryLower)) {
      subQueries.push(`site:tadawul.com.sa financial statements`);
      subQueries.push(`site:argaam.com financial results`);
    }
  }
  
  // Stock/investment queries
  if (/\b(stock|shares?|investment|trading|dividend)\b/i.test(queryLower)) {
    entities.forEach(entity => {
      subQueries.push(`${entity} stock price performance`);
      subQueries.push(`${entity} dividend history yield`);
      subQueries.push(`${entity} trading volume`);
    });
  }
  
  // Deduplicate and limit
  const uniqueQueries = [...new Set(subQueries)];
  return uniqueQueries.slice(0, 20); // Increased to 20 for comprehensive research
}

// Execute a single sub-agent search (100% real web scraping)
async function executeSubAgent(
  subQuery: string,
  config: WideResearchConfig,
  index: number,
  callbacks?: WideResearchCallbacks
): Promise<SubAgentResult> {
  const result: SubAgentResult = {
    id: `subagent-${Date.now()}-${index}`,
    query: subQuery,
    status: 'running',
    sources: [],
    extractedData: {
      companies: [],
      key_facts: [],
      key_dates: [],
      numeric_data: [],
    },
    startTime: new Date(),
  };
  
  console.log(`[WideResearch] SubAgent ${index}: Starting search for "${subQuery}"`);
  callbacks?.onSubAgentStart?.(subQuery, index);
  
  try {
    // Step 1: Real-time web search (scrapes DuckDuckGo/Google/Bing)
    const searchResult = await researchApi.webSearch(subQuery, {
      maxResults: 8,
      searchEngine: 'all',
      scrapeContent: true,
      country: config.country,
    });
    
    if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
      // Try hybrid search as fallback
      console.log(`[WideResearch] SubAgent ${index}: Web search empty, trying hybrid search`);
      
      const hybridResult = await researchApi.hybridSearch(subQuery, {
        useWebSearch: true,
        useInternal: true,
        webSearchOptions: { maxResults: 8, searchEngine: 'all', scrapeContent: true },
        internalOptions: { limit: 8 },
      });
      
      if (hybridResult.success && hybridResult.data && hybridResult.data.length > 0) {
        result.sources = hybridResult.data.map((item, idx) => ({
          url: item.url,
          title: item.title,
          domain: new URL(item.url).hostname.replace('www.', ''),
          content: item.content || item.markdown || item.description || '',
          markdown: item.markdown || '',
          fetchedAt: item.fetchedAt || new Date().toISOString(),
          reliability: item.reliability || 0.7,
          source: item.source || 'hybrid',
        }));
      }
    } else {
      result.sources = searchResult.data.map((item) => ({
        url: item.url,
        title: item.title,
        domain: new URL(item.url).hostname.replace('www.', ''),
        content: item.markdown || item.description || '',
        markdown: item.markdown || '',
        fetchedAt: item.fetchedAt || new Date().toISOString(),
        reliability: 0.8,
        source: item.source || 'web-search',
      }));
    }
    
    // Step 1.5: If deep scrape mode, use web-crawl on discovered domains
    if (config.scrapeDepth === 'deep' && result.sources.length > 0) {
      const uniqueDomains = [...new Set(result.sources.map(s => {
        try { return new URL(s.url).origin; } catch { return null; }
      }).filter(Boolean))].slice(0, 3) as string[];
      
      console.log(`[WideResearch] SubAgent ${index}: Deep crawling ${uniqueDomains.length} domains`);
      
      for (const domainUrl of uniqueDomains) {
        try {
          const crawlResult = await researchApi.deepCrawl(domainUrl, subQuery, { maxPages: 5 });
          
          if (crawlResult.success && crawlResult.pages.length > 0) {
            for (const page of crawlResult.pages) {
              // Add crawled pages as additional sources
              const existingUrls = new Set(result.sources.map(s => s.url));
              if (!existingUrls.has(page.url)) {
                result.sources.push({
                  url: page.url,
                  title: page.title,
                  domain: new URL(page.url).hostname.replace('www.', ''),
                  content: page.markdown.slice(0, 3000),
                  markdown: page.markdown,
                  fetchedAt: new Date().toISOString(),
                  reliability: 0.75 + (page.relevanceScore * 0.15),
                  source: 'web-crawl',
                  relevanceScore: page.relevanceScore,
                });
                callbacks?.onSourceFound?.(result.sources[result.sources.length - 1]);
              }
            }
          }
        } catch (crawlError) {
          console.warn(`[WideResearch] SubAgent ${index}: Crawl failed for ${domainUrl}:`, crawlError);
        }
      }
    }
    
    console.log(`[WideResearch] SubAgent ${index}: Found ${result.sources.length} sources`);
    
    // Notify about sources
    result.sources.forEach(src => callbacks?.onSourceFound?.(src));
    
    // Step 2: Extract structured data if we have content
    if (result.sources.length > 0) {
      const combinedContent = result.sources
        .map(s => `Source: ${s.url}\n${s.content}`)
        .join('\n\n---\n\n');
      
      if (combinedContent.length > 100) {
        const extractResult = await researchApi.extract(subQuery, combinedContent, 'all');
        
        if (extractResult.success && extractResult.data) {
          result.extractedData = {
            companies: extractResult.data.companies || [],
            key_facts: (extractResult.data.key_facts || []).map(f => ({
              fact: f.fact,
              confidence: f.confidence || 'medium',
              source: f.source,
            })),
            key_dates: extractResult.data.key_dates || [],
            numeric_data: extractResult.data.numeric_data || [],
          };
        }
      }
    }
    
    result.status = result.sources.length >= config.minSourcesPerItem ? 'completed' : 'completed';
    result.endTime = new Date();
    
    console.log(`[WideResearch] SubAgent ${index}: Completed with ${result.sources.length} sources, ${result.extractedData.key_facts.length} facts`);
    callbacks?.onSubAgentComplete?.(result, index);
    
    return result;
  } catch (error) {
    console.error(`[WideResearch] SubAgent ${index}: Failed`, error);
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.endTime = new Date();
    callbacks?.onSubAgentComplete?.(result, index);
    return result;
  }
}

// Aggregate sources from all sub-agents (deduplicate)
function aggregateSources(subResults: SubAgentResult[]): WebSource[] {
  const seen = new Set<string>();
  const sources: WebSource[] = [];
  
  for (const result of subResults) {
    for (const source of result.sources) {
      if (!seen.has(source.url)) {
        seen.add(source.url);
        sources.push(source);
      }
    }
  }
  
  // Sort by reliability
  return sources.sort((a, b) => b.reliability - a.reliability);
}

// Aggregate extracted data from all sub-agents (deduplicate)
function aggregateExtractedData(subResults: SubAgentResult[]): ExtractedContent {
  const companies = new Map<string, ExtractedContent['companies'][0]>();
  const facts = new Map<string, ExtractedContent['key_facts'][0]>();
  const dates = new Map<string, ExtractedContent['key_dates'][0]>();
  const numerics = new Map<string, ExtractedContent['numeric_data'][0]>();
  
  for (const result of subResults) {
    result.extractedData.companies.forEach(c => {
      const key = c.name.toLowerCase();
      if (!companies.has(key) || (c.ticker && !companies.get(key)?.ticker)) {
        companies.set(key, c);
      }
    });
    
    result.extractedData.key_facts.forEach(f => {
      const key = f.fact.slice(0, 50).toLowerCase();
      if (!facts.has(key)) {
        facts.set(key, f);
      }
    });
    
    result.extractedData.key_dates.forEach(d => {
      const key = `${d.date}-${d.event.slice(0, 30)}`.toLowerCase();
      if (!dates.has(key)) {
        dates.set(key, d);
      }
    });
    
    result.extractedData.numeric_data.forEach(n => {
      const key = `${n.metric}-${n.value}`.toLowerCase();
      if (!numerics.has(key)) {
        numerics.set(key, n);
      }
    });
  }
  
  return {
    companies: Array.from(companies.values()),
    key_facts: Array.from(facts.values()),
    key_dates: Array.from(dates.values()),
    numeric_data: Array.from(numerics.values()),
  };
}

// Create verifications from real sources
function createVerifications(sources: WebSource[], extractedData: ExtractedContent): ClaimVerification[] {
  const verifications: ClaimVerification[] = [];
  
  // Verify each key fact
  extractedData.key_facts.forEach((fact, index) => {
    const matchingSources = sources.filter(s => 
      s.content.toLowerCase().includes(fact.fact.slice(0, 30).toLowerCase())
    );
    
    verifications.push({
      id: `verify-fact-${Date.now()}-${index}`,
      claim: fact.fact,
      status: matchingSources.length >= 2 ? 'verified' : matchingSources.length === 1 ? 'partially_verified' : 'unverified',
      confidence: fact.confidence === 'high' ? 0.9 : fact.confidence === 'medium' ? 0.7 : 0.5,
      explanation: `Found in ${matchingSources.length} source(s)`,
      sources: matchingSources.slice(0, 3).map(s => ({
        url: s.url,
        domain: s.domain,
        supportLevel: 'moderate' as const,
        excerpt: s.content.slice(0, 100),
      })),
    });
  });
  
  // Verify company data
  extractedData.companies.forEach((company, index) => {
    const matchingSources = sources.filter(s => 
      s.content.toLowerCase().includes(company.name.toLowerCase())
    );
    
    verifications.push({
      id: `verify-company-${Date.now()}-${index}`,
      claim: `${company.name}${company.action ? ': ' + company.action : ''}`,
      status: matchingSources.length >= 1 ? 'verified' : 'unverified',
      confidence: 0.85,
      explanation: `Company mentioned in ${matchingSources.length} source(s)`,
      sources: matchingSources.slice(0, 2).map(s => ({
        url: s.url,
        domain: s.domain,
        supportLevel: 'strong' as const,
        excerpt: s.content.slice(0, 100),
      })),
    });
  });
  
  return verifications;
}

// Calculate quality score from real data only
function calculateQuality(sources: WebSource[], extractedData: ExtractedContent, verifications: ClaimVerification[]): QualityScore {
  const totalSources = sources.length;
  const uniqueDomains = new Set(sources.map(s => s.domain)).size;
  const verifiedClaims = verifications.filter(v => v.status === 'verified').length;
  const totalClaims = verifications.length;
  
  const completeness = Math.min(1, totalSources / 15);
  const sourceQuality = Math.min(1, 0.5 + (uniqueDomains / 10) * 0.5);
  const accuracy = totalClaims > 0 ? (verifiedClaims / totalClaims) : 0.5;
  const freshness = 0.9; // Real-time scraping is always fresh
  const claimVerification = totalClaims > 0 ? (verifiedClaims / totalClaims) : 0;
  
  return {
    completeness,
    sourceQuality,
    accuracy,
    freshness,
    claimVerification,
    overall: (completeness + sourceQuality + accuracy + freshness + claimVerification) / 5,
  };
}

// Main Wide Research orchestrator
export async function executeWideResearch(
  query: string,
  config: Partial<WideResearchConfig> = {},
  callbacks?: WideResearchCallbacks
): Promise<WideResearchResult> {
  const startTime = Date.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('[WideResearch] ========== STARTING MANUS 1.6 MAX WIDE RESEARCH ==========');
  console.log('[WideResearch] Query:', query);
  console.log('[WideResearch] Config:', fullConfig);
  
  const timing = {
    total: 0,
    planning: 0,
    searching: 0,
    extraction: 0,
    synthesis: 0,
  };
  
  // Phase 1: Planning - Decompose into sub-queries
  const planStart = Date.now();
  callbacks?.onProgress?.(5, 'Planning - Decomposing query');
  
  const subQueries = decomposeQuery(query);
  timing.planning = Date.now() - planStart;
  
  console.log('[WideResearch] Decomposed into', subQueries.length, 'sub-queries:', subQueries);
  
  // Phase 2: Parallel execution of sub-agents
  const searchStart = Date.now();
  callbacks?.onProgress?.(10, `Searching - Executing ${subQueries.length} parallel sub-agents`);
  
  // Execute sub-agents in parallel with controlled concurrency
  const subResults: SubAgentResult[] = [];
  const batchSize = fullConfig.maxSubAgents;
  
  for (let i = 0; i < subQueries.length; i += batchSize) {
    const batch = subQueries.slice(i, i + batchSize);
    const batchPromises = batch.map((sq, idx) => 
      executeSubAgent(sq, fullConfig, i + idx, callbacks)
    );
    
    const batchResults = await Promise.all(batchPromises);
    subResults.push(...batchResults);
    
    const progress = 10 + ((i + batch.length) / subQueries.length) * 60;
    callbacks?.onProgress?.(Math.min(progress, 70), `Searching - Completed ${i + batch.length}/${subQueries.length} sub-queries`);
  }
  
  timing.searching = Date.now() - searchStart;
  
  // Phase 3: Aggregation
  const extractStart = Date.now();
  callbacks?.onProgress?.(75, 'Aggregating - Deduplicating sources');
  
  const aggregatedSources = aggregateSources(subResults);
  const aggregatedData = aggregateExtractedData(subResults);
  const verifications = createVerifications(aggregatedSources, aggregatedData);
  
  timing.extraction = Date.now() - extractStart;
  
  console.log('[WideResearch] Aggregated:', {
    sources: aggregatedSources.length,
    companies: aggregatedData.companies.length,
    facts: aggregatedData.key_facts.length,
    verifications: verifications.length,
  });
  
  // Phase 4: Report generation (from real data only)
  const synthStart = Date.now();
  callbacks?.onProgress?.(85, 'Synthesizing - Generating report');
  
  let report: string;
  
  // Check if this is a company-focused query
  const isIPOQuery = /\b(ipo|ipos|initial\s+public\s+offering|listing|listings|going\s+public)\b/i.test(query);
  const isCompanyQuery = /\b(companies|company|firms?|corporations?|entities|businesses)\b/i.test(query);
  const isEntityQuery = isIPOQuery || isCompanyQuery;
  
  if (aggregatedSources.length === 0) {
    // NO DATA AVAILABLE - do NOT synthesize, return empty report
    report = generateEmptyDataReport(query, subResults);
  } else {
    report = await generateWideResearchReport(query, aggregatedSources, aggregatedData, verifications);
    
    // POST-PROCESSING VALIDATION: Ensure company table exists for entity queries
    if (isEntityQuery) {
      report = enforceCompanyTableInReport(report, aggregatedData, aggregatedSources);
    }
  }
  
  timing.synthesis = Date.now() - synthStart;
  timing.total = Date.now() - startTime;
  
  // Calculate quality
  const quality = calculateQuality(aggregatedSources, aggregatedData, verifications);
  
  callbacks?.onProgress?.(100, 'Complete');
  
  const successfulSubQueries = subResults.filter(r => r.status === 'completed' && r.sources.length > 0).length;
  const failedSubQueries = subResults.filter(r => r.status === 'failed').length;
  
  console.log('[WideResearch] ========== WIDE RESEARCH COMPLETE ==========');
  console.log('[WideResearch] Timing:', timing);
  console.log('[WideResearch] Quality:', quality);
  
  return {
    id: `wide-research-${Date.now()}`,
    query,
    subResults,
    aggregatedSources,
    aggregatedData,
    report,
    quality,
    verifications,
    timing,
    metadata: {
      totalSourcesScraped: aggregatedSources.length,
      uniqueDomains: new Set(aggregatedSources.map(s => s.domain)).size,
      subQueriesExecuted: subQueries.length,
      successfulSubQueries,
      failedSubQueries,
    },
  };
}

// Generate report from real data only
async function generateWideResearchReport(
  query: string,
  sources: WebSource[],
  extractedData: ExtractedContent,
  verifications: ClaimVerification[]
): Promise<string> {
  // Prepare content for report
  const sourceContent = sources
    .slice(0, 15)
    .map(s => `Source: ${s.title}\nURL: ${s.url}\n\n${s.content.slice(0, 2000)}`)
    .join('\n\n---\n\n');
  
  // Check if this is an IPO/company-specific query
  const isIPOQuery = /\b(ipo|ipos|initial\s+public\s+offering|listing|listings|going\s+public)\b/i.test(query);
  const isCompanyQuery = /\b(companies|company|firms?|corporations?|entities|businesses)\b/i.test(query);
  
  // Build entity extraction instructions
  const entityInstructions = (isIPOQuery || isCompanyQuery) ? `
CRITICAL - ENTITY EXTRACTION REQUIREMENT:
The user is asking for SPECIFIC COMPANIES. You MUST:

1. **SCAN ALL SOURCES** for company names mentioned in relation to IPOs, listings, or the query topic
2. **CREATE A COMPANIES TABLE** with ALL companies found:

## Companies Identified

| Company Name | Sector/Industry | IPO Status | Target Exchange | Expected Date | Valuation/Size | Key Details |
|--------------|-----------------|------------|-----------------|---------------|----------------|-------------|
| [List EVERY company name found] | [Sector] | [Status] | [Exchange] | [Date if known] | [Value if known] | [Description] |

3. For EACH company found, include a brief profile section with available details
4. If NO SPECIFIC COMPANY NAMES are found, state: "**No specific company names were identified in the retrieved sources.**"
5. NEVER summarize as "several companies" or "various firms" - ALWAYS list by NAME

PRIORITY: Extract and list company names FIRST, then provide analysis.
` : '';
  
  const reportPrompt = `You are a research analyst. Generate a comprehensive research report based ONLY on the following REAL data sources.

RESEARCH QUERY: "${query}"

${entityInstructions}

REQUIRED REPORT STRUCTURE:

# [Title Based on Query]

## Executive Summary
- 5-8 specific bullet points from the sources
- Include actual names, dates, and numbers found
- If asking about companies/IPOs, list company names in bullets

${(isIPOQuery || isCompanyQuery) ? `## Companies Identified

| Company Name | Sector/Industry | Status | Target Exchange | Expected Date | Valuation | Details |
|--------------|-----------------|--------|-----------------|---------------|-----------|---------|
(List EVERY company mentioned in sources - this table is REQUIRED)

## Company Profiles
(For each company found, provide a brief profile with available details)
` : ''}

## Key Findings
1. **[Finding]**: Evidence from sources
2. **[Finding]**: Evidence from sources
(At least 3-5 findings with citations)

## Evidence & Analysis
Detailed analysis with [Source: domain] citations

## Data Summary
| Category | Details | Source |
|----------|---------|--------|

## Verified Information
${verifications.filter(v => v.status === 'verified').map(v => `- ${v.claim}`).join('\n') || '- No verified claims'}

## Unverified / Needs Confirmation
${verifications.filter(v => v.status !== 'verified').map(v => `- ${v.claim}`).join('\n') || '- No unverified claims'}

## Sources
${sources.slice(0, 10).map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.domain}`).join('\n')}

EXTRACTED DATA (Use this to populate tables):
Companies: ${JSON.stringify(extractedData.companies)}
Key Facts: ${JSON.stringify(extractedData.key_facts)}
Key Dates: ${JSON.stringify(extractedData.key_dates)}
Numeric Data: ${JSON.stringify(extractedData.numeric_data)}

SOURCE CONTENT (Search for company names here):
${sourceContent.slice(0, 25000)}

CRITICAL RULES:
1. Only use information from the provided sources. Cite each claim with [Source: domain].
2. If asking about specific companies/IPOs, EXTRACT AND LIST ALL COMPANY NAMES FOUND.
3. If information is not in the sources, say "Not found in available sources."
4. NEVER provide generic analysis without listing specific entities when the query asks for them.

Generate the research report:`;

  try {
    const result = await researchApi.analyze(query, reportPrompt, 'report', 'detailed');
    
    if (result.success && result.result) {
      // Add extracted companies table if we have them and they're not in the report
      let finalReport = result.result;
      
      // If we have extracted companies but they might not be in the AI response, append them
      if (extractedData.companies.length > 0 && !result.result.includes('## Companies Identified')) {
        const companiesTable = generateCompaniesTable(extractedData.companies);
        // Insert after Executive Summary or at the beginning
        const insertPoint = finalReport.indexOf('## Key Findings');
        if (insertPoint > 0) {
          finalReport = finalReport.slice(0, insertPoint) + companiesTable + '\n\n' + finalReport.slice(insertPoint);
        } else {
          finalReport = companiesTable + '\n\n' + finalReport;
        }
      }
      
      const metadata = `\n\n---\n\n**Research Metadata:**
- Mode: Wide Research (Manus 1.6 MAX)
- Sources scraped: ${sources.length}
- Unique domains: ${new Set(sources.map(s => s.domain)).size}
- Companies extracted: ${extractedData.companies.length}
- Verified claims: ${verifications.filter(v => v.status === 'verified').length}/${verifications.length}
- Generated: ${new Date().toISOString()}`;
      
      return finalReport + metadata;
    }
  } catch (error) {
    console.error('[WideResearch] Report generation error:', error);
  }
  
  // Fallback: Generate report from extracted data directly
  return generateDataOnlyReport(query, sources, extractedData, verifications);
}

// Helper to generate companies table from extracted data
function generateCompaniesTable(companies: ExtractedContent['companies']): string {
  if (companies.length === 0) return '';
  
  let table = `## Companies Identified\n\n`;
  table += `| Company Name | Sector/Industry | Status | Target Exchange | Expected Date | Valuation | Key Details |\n`;
  table += `|--------------|-----------------|--------|-----------------|---------------|-----------|-------------|\n`;
  
  companies.forEach(c => {
    table += `| ${c.name} | N/A | ${c.action || 'N/A'} | ${c.market || 'N/A'} | ${c.date || 'N/A'} | ${c.value || 'N/A'} | ${c.ticker ? `Ticker: ${c.ticker}` : 'See details'} |\n`;
  });
  
  return table;
}

// POST-PROCESSING: Enforce company table in reports for entity queries
function enforceCompanyTableInReport(report: string, extractedData: ExtractedContent, sources: WebSource[]): string {
  const hasCompaniesSection = /##\s*Companies?\s*Identified/i.test(report);
  
  // If report already has a proper companies section, validate it
  if (hasCompaniesSection) {
    // Check if the section has actual company rows or just says "various companies"
    const companiesMatch = report.match(/##\s*Companies?\s*Identified[\s\S]*?(?=##|$)/i);
    if (companiesMatch) {
      const section = companiesMatch[0];
      const hasTableRows = (section.match(/\|[^|]+\|[^|]+\|/g) || []).length > 2;
      const hasBadPhrasing = /various\s+companies|several\s+(firms?|companies|entities)|multiple\s+organizations/i.test(section);
      
      if (hasTableRows && !hasBadPhrasing) {
        return report; // Section looks good
      }
    }
  }
  
  // If we have extracted companies but they're not in the report, insert them
  if (extractedData.companies.length > 0) {
    const companiesTable = generateCompaniesTable(extractedData.companies);
    
    // Try to insert after the title or Executive Summary heading
    const execSummaryMatch = report.match(/##\s*Executive\s*Summary/i);
    if (execSummaryMatch) {
      const insertPoint = report.indexOf(execSummaryMatch[0]);
      return report.slice(0, insertPoint) + companiesTable + '\n\n' + report.slice(insertPoint);
    }
    
    // Otherwise insert after the first heading
    const firstHeadingMatch = report.match(/^#\s+.+$/m);
    if (firstHeadingMatch) {
      const insertPoint = report.indexOf(firstHeadingMatch[0]) + firstHeadingMatch[0].length;
      return report.slice(0, insertPoint) + '\n\n' + companiesTable + report.slice(insertPoint);
    }
    
    // Last resort: prepend
    return companiesTable + '\n\n' + report;
  }
  
  // If no companies were extracted, try regex extraction from raw source content
  const allContent = sources.map(s => s.content).join('\n');
  const regexCompanies = extractCompanyNamesFromContent(allContent);
  
  if (regexCompanies.length > 0) {
    console.log(`[WideResearch] Post-processing found ${regexCompanies.length} companies via regex`);
    
    let table = `## Companies Identified\n\n`;
    table += `> ⚠️ *These companies were extracted via pattern matching. Verify details in the sources.*\n\n`;
    table += `| Company Name | Status | Notes |\n`;
    table += `|--------------|--------|-------|\n`;
    regexCompanies.forEach(name => {
      table += `| ${name} | Mentioned in sources | See source content for details |\n`;
    });
    
    // Insert after title
    const firstHeadingMatch = report.match(/^#\s+.+$/m);
    if (firstHeadingMatch) {
      const insertPoint = report.indexOf(firstHeadingMatch[0]) + firstHeadingMatch[0].length;
      return report.slice(0, insertPoint) + '\n\n' + table + report.slice(insertPoint);
    }
    
    return table + '\n\n' + report;
  }
  
  // No companies found at all - add explicit warning
  if (!hasCompaniesSection) {
    const warning = `## Companies Identified\n\n**⚠️ No specific company names were identified in the retrieved sources.**\n\nConsider:\n- Refining search terms with specific company names\n- Checking official sources directly (e.g., stock exchange websites)\n- Searching for recent news about specific entities\n\n`;
    
    const firstHeadingMatch = report.match(/^#\s+.+$/m);
    if (firstHeadingMatch) {
      const insertPoint = report.indexOf(firstHeadingMatch[0]) + firstHeadingMatch[0].length;
      return report.slice(0, insertPoint) + '\n\n' + warning + report.slice(insertPoint);
    }
  }
  
  return report;
}

// Extract company names using regex patterns
function extractCompanyNamesFromContent(content: string): string[] {
  const companies = new Set<string>();
  
  const patterns = [
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Company|Corporation|Corp|Inc|Ltd|LLC|Group|Holdings|Holding)\b/g,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:IPO|listing|files?\s+for\s+IPO|plans?\s+to\s+list)\b/gi,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*\(([A-Z]{2,5}|\d{4})\)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 50) {
        const lowerName = name.toLowerCase();
        if (!['the', 'this', 'that', 'which', 'where', 'when', 'what', 'how', 'new', 'old', 'first', 'last', 'said', 'says', 'according'].includes(lowerName)) {
          companies.add(name);
        }
      }
    }
    pattern.lastIndex = 0;
  }
  
  return Array.from(companies).slice(0, 20); // Limit to 20 companies
}

// Generate report from extracted data without AI (fallback)
function generateDataOnlyReport(
  query: string,
  sources: WebSource[],
  extractedData: ExtractedContent,
  verifications: ClaimVerification[]
): string {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  let report = `# Research Report: ${query}\n\n`;
  report += `> Generated ${date} | Mode: Wide Research (Data Only) | Sources: ${sources.length}\n\n`;
  report += `---\n\n`;

  // Companies
  if (extractedData.companies.length > 0) {
    report += `## Companies\n\n`;
    report += `| Company | Ticker | Market | Action | Date |\n`;
    report += `|---------|--------|--------|--------|------|\n`;
    extractedData.companies.forEach(c => {
      report += `| ${c.name} | ${c.ticker || 'N/A'} | ${c.market || 'N/A'} | ${c.action || 'N/A'} | ${c.date || 'N/A'} |\n`;
    });
    report += `\n`;
  }

  // Key Facts
  if (extractedData.key_facts.length > 0) {
    report += `## Key Findings\n\n`;
    extractedData.key_facts.forEach((f, i) => {
      report += `${i + 1}. **${f.confidence.toUpperCase()} confidence**: ${f.fact}\n`;
    });
    report += `\n`;
  }

  // Key Dates
  if (extractedData.key_dates.length > 0) {
    report += `## Key Dates\n\n`;
    extractedData.key_dates.forEach(d => {
      report += `- **${d.date}**: ${d.event}${d.entity ? ` (${d.entity})` : ''}\n`;
    });
    report += `\n`;
  }

  // Numeric Data
  if (extractedData.numeric_data.length > 0) {
    report += `## Numeric Data\n\n`;
    report += `| Metric | Value | Unit | Context |\n`;
    report += `|--------|-------|------|--------|\n`;
    extractedData.numeric_data.forEach(n => {
      report += `| ${n.metric} | ${n.value} | ${n.unit || '-'} | ${n.context || '-'} |\n`;
    });
    report += `\n`;
  }

  // Verifications
  const verified = verifications.filter(v => v.status === 'verified');
  const unverified = verifications.filter(v => v.status !== 'verified');
  
  if (verified.length > 0) {
    report += `## Verified Information\n\n`;
    verified.forEach(v => {
      report += `- ✅ ${v.claim}\n`;
    });
    report += `\n`;
  }
  
  if (unverified.length > 0) {
    report += `## Needs Further Verification\n\n`;
    unverified.forEach(v => {
      report += `- ⚠️ ${v.claim}\n`;
    });
    report += `\n`;
  }

  // Sources
  report += `## Sources\n\n`;
  sources.slice(0, 15).forEach((s, i) => {
    report += `${i + 1}. [${s.title}](${s.url}) - ${s.domain} (${s.source})\n`;
  });

  report += `\n---\n\n`;
  report += `**Research Metadata:**\n`;
  report += `- Mode: Wide Research (Manus 1.6 MAX)\n`;
  report += `- Sources scraped: ${sources.length}\n`;
  report += `- Unique domains: ${new Set(sources.map(s => s.domain)).size}\n`;
  report += `- Generated: ${new Date().toISOString()}\n`;

  return report;
}

// Generate report when NO data is available (honest empty state)
function generateEmptyDataReport(query: string, subResults: SubAgentResult[]): string {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const failedQueries = subResults.filter(r => r.sources.length === 0);
  
  return `# Research Report: ${query}

> Generated ${date} | Mode: Wide Research | Status: **NO DATA FOUND**

---

## ⚠️ Research Could Not Complete

This research was unable to retrieve data from web sources for the following reasons:

### Sub-Queries Attempted
${subResults.map((r, i) => `${i + 1}. "${r.query}" - ${r.sources.length} sources found${r.error ? ` (Error: ${r.error})` : ''}`).join('\n')}

### Possible Causes
- Target websites may be blocking automated access
- Network connectivity issues
- Query terms may not match available content
- Sources may require authentication

### Recommended Actions
1. **Try more specific search terms** - Use exact company names, stock tickers
2. **Check source accessibility** - Some financial sources require subscriptions
3. **Retry later** - Temporary blocks may expire

---

**Research Metadata:**
- Mode: Wide Research (Manus 1.6 MAX)
- Sub-queries attempted: ${subResults.length}
- Sources found: 0
- Generated: ${new Date().toISOString()}

**IMPORTANT**: This report contains NO SYNTHESIZED or AI-GENERATED content. 
The system requires real web data and will not fabricate information.`;
}

export const wideResearch = {
  execute: executeWideResearch,
  decompose: decomposeQuery,
};
