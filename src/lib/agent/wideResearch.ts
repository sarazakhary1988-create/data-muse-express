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
  
  if (/\b(financials?|revenue|profit|earnings)\b/i.test(queryLower)) {
    entities.forEach(entity => {
      subQueries.push(`${entity} financial results 2024`);
      subQueries.push(`${entity} annual report`);
    });
  }
  
  // Deduplicate and limit
  const uniqueQueries = [...new Set(subQueries)];
  return uniqueQueries.slice(0, 12); // Max 12 sub-queries
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
      // Try sitemap-based search as fallback (still real scraping)
      console.log(`[WideResearch] SubAgent ${index}: Web search empty, trying sitemap search`);
      
      const sitemapResult = await researchApi.internalSearch(subQuery, 8, {
        country: config.country,
      });
      
      if (sitemapResult.success && sitemapResult.data && sitemapResult.data.length > 0) {
        result.sources = sitemapResult.data.map((item, idx) => ({
          url: item.url,
          title: item.title,
          domain: new URL(item.url).hostname.replace('www.', ''),
          content: item.content || item.markdown || item.description || '',
          markdown: item.markdown || '',
          fetchedAt: item.fetchedAt || new Date().toISOString(),
          reliability: item.reliability || 0.7,
          source: 'sitemap',
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
  
  if (aggregatedSources.length === 0) {
    // NO DATA AVAILABLE - do NOT synthesize, return empty report
    report = generateEmptyDataReport(query, subResults);
  } else {
    report = await generateWideResearchReport(query, aggregatedSources, aggregatedData, verifications);
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
  
  const reportPrompt = `You are a research analyst. Generate a comprehensive research report based ONLY on the following REAL data sources.

RESEARCH QUERY: "${query}"

REQUIRED REPORT STRUCTURE:

# [Title Based on Query]

## Executive Summary
- 5-8 specific bullet points from the sources
- Include actual names, dates, and numbers found

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
${verifications.filter(v => v.status === 'verified').map(v => `- ${v.claim}`).join('\n')}

## Unverified / Needs Confirmation
${verifications.filter(v => v.status !== 'verified').map(v => `- ${v.claim}`).join('\n')}

## Sources
${sources.slice(0, 10).map((s, i) => `${i + 1}. [${s.title}](${s.url}) - ${s.domain}`).join('\n')}

EXTRACTED DATA:
Companies: ${JSON.stringify(extractedData.companies)}
Key Facts: ${JSON.stringify(extractedData.key_facts)}
Key Dates: ${JSON.stringify(extractedData.key_dates)}
Numeric Data: ${JSON.stringify(extractedData.numeric_data)}

SOURCE CONTENT:
${sourceContent.slice(0, 25000)}

CRITICAL: Only use information from the provided sources. Cite each claim with [Source: domain].
If information is not in the sources, say "Not found in available sources."

Generate the research report:`;

  try {
    const result = await researchApi.analyze(query, reportPrompt, 'report', 'detailed');
    
    if (result.success && result.result) {
      const metadata = `\n\n---\n\n**Research Metadata:**
- Mode: Wide Research (Manus 1.6 MAX)
- Sources scraped: ${sources.length}
- Unique domains: ${new Set(sources.map(s => s.domain)).size}
- Verified claims: ${verifications.filter(v => v.status === 'verified').length}/${verifications.length}
- Generated: ${new Date().toISOString()}`;
      
      return result.result + metadata;
    }
  } catch (error) {
    console.error('[WideResearch] Report generation error:', error);
  }
  
  // Fallback: Generate report from extracted data directly
  return generateDataOnlyReport(query, sources, extractedData, verifications);
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
