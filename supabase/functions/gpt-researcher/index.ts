import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// GPT-RESEARCHER INTEGRATION
// ========================================
// Integrates with GPT-Researcher for autonomous deep research
// GitHub: https://github.com/assafelovic/gpt-researcher
// Provides parallel research, source aggregation, fact verification
// Uses: OpenAI/Claude as primary (NOT ORKESTRA AI)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResearchRequest {
  query: string;
  reportType?: 'research_report' | 'resource_report' | 'outline_report' | 'custom_report';
  maxSources?: number;
  parallelAgents?: number;
  includeFactVerification?: boolean;
  outputFormat?: 'markdown' | 'json' | 'pdf';
  llmProvider?: 'openai' | 'anthropic' | 'groq' | 'auto';
}

interface ResearchResult {
  report: string;
  sources: SourceInfo[];
  factsVerified: VerifiedFact[];
  metadata: ResearchMetadata;
}

interface SourceInfo {
  url: string;
  title: string;
  domain: string;
  relevanceScore: number;
  extractedContent: string;
  publishDate?: string;
  author?: string;
}

interface VerifiedFact {
  claim: string;
  verified: boolean;
  sources: string[];
  confidence: number;
}

interface ResearchMetadata {
  totalSources: number;
  totalAgents: number;
  executionTimeMs: number;
  queriesExecuted: number;
  llmProvider: string;
}

// GPT-Researcher style sub-agents
const RESEARCH_AGENTS = [
  { id: 'planner', name: 'Research Planner', role: 'Breaks down research query into sub-questions' },
  { id: 'searcher', name: 'Web Searcher', role: 'Searches multiple sources for relevant information' },
  { id: 'scraper', name: 'Content Scraper', role: 'Extracts and cleans content from web pages' },
  { id: 'analyzer', name: 'Content Analyzer', role: 'Analyzes and synthesizes information' },
  { id: 'verifier', name: 'Fact Verifier', role: 'Cross-references claims across sources' },
  { id: 'writer', name: 'Report Writer', role: 'Generates comprehensive research report' },
];

// LLM Provider configuration - prioritize local models via LLM Router
// The LLM Router handles Ollama/vLLM/HuggingFace TGI local inference
// Fallback chain: Local (DeepSeek/Llama/Qwen) -> OpenAI -> Claude -> ORKESTRA AI

function getSupabaseClient() {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ResearchRequest = await req.json();
    const { 
      query, 
      reportType = 'research_report',
      maxSources = 10,
      parallelAgents = 3,
      includeFactVerification = true,
      outputFormat = 'markdown',
    } = request;

    console.log(`[GPT-Researcher] Starting research: "${query}"`);
    const startTime = Date.now();

    const supabase = getSupabaseClient();

    // PHASE 1: Plan research with sub-questions
    const subQuestions = await generateSubQuestions(query, supabase);
    console.log(`[GPT-Researcher] Generated ${subQuestions.length} sub-questions`);

    // PHASE 2: Search sources in parallel
    const sources = await searchSources(query, subQuestions, maxSources, supabase);
    console.log(`[GPT-Researcher] Found ${sources.length} sources`);

    // PHASE 3: Extract content from sources
    const extractedSources = await extractContent(sources, supabase);
    console.log(`[GPT-Researcher] Extracted content from ${extractedSources.length} sources`);

    // PHASE 4: Verify facts (if enabled)
    let verifiedFacts: VerifiedFact[] = [];
    if (includeFactVerification && extractedSources.length >= 2) {
      verifiedFacts = await verifyFacts(extractedSources, supabase);
      console.log(`[GPT-Researcher] Verified ${verifiedFacts.length} facts`);
    }

    // PHASE 5: Generate report
    const report = await generateReport(
      query, 
      extractedSources, 
      verifiedFacts, 
      reportType,
      supabase
    );

    const result: ResearchResult = {
      report,
      sources: extractedSources,
      factsVerified: verifiedFacts,
      metadata: {
        totalSources: extractedSources.length,
        totalAgents: RESEARCH_AGENTS.length,
        executionTimeMs: Date.now() - startTime,
        queriesExecuted: subQuestions.length + 1,
        llmProvider: 'LLM Router (Local Priority)',
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GPT-Researcher] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Call LLM via the unified LLM Router (prioritizes local inference)
async function callLLM(
  supabase: { url: string; key: string },
  systemPrompt: string,
  userPrompt: string,
  task: 'reasoning' | 'planning' | 'synthesis' | 'research' = 'research'
): Promise<string> {
  const response = await fetch(`${supabase.url}/functions/v1/llm-router`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabase.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      task,
      preferLocal: true, // Prioritize DeepSeek/Llama/Qwen local models
      maxTokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM Router error: ${error}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'LLM call failed');
  }

  console.log(`[GPT-Researcher] LLM: ${data.model} (${data.inferenceType})`);
  return data.content;
}

// Generate sub-questions for comprehensive research
async function generateSubQuestions(query: string, supabase: { url: string; key: string }): Promise<string[]> {
  try {
    const content = await callLLM(
      supabase,
      `You are a research planner. Given a research query, generate 3-5 specific sub-questions 
that would help comprehensively answer the main query. Return ONLY a JSON object with a "questions" array of strings.`,
      query,
      'planning'
    );

    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    return parsed.questions || parsed.subQuestions || [query];
  } catch (error) {
    console.error('Failed to generate sub-questions:', error);
    return [query];
  }
}

// Search for sources using web search - PARALLEL execution
async function searchSources(
  mainQuery: string, 
  subQuestions: string[], 
  maxSources: number,
  supabase: { url: string; key: string }
): Promise<SourceInfo[]> {
  const allSources: SourceInfo[] = [];
  const seenUrls = new Set<string>();

  const queries = [mainQuery, ...subQuestions.slice(0, 4)];
  
  // Execute all searches in PARALLEL for speed
  const searchPromises = queries.map(async (query) => {
    try {
      const response = await fetch(`${supabase.url}/functions/v1/web-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          maxResults: Math.ceil(maxSources / queries.length),
          searchEngine: 'all',
          scrapeContent: false,
        }),
      });

      if (!response.ok) {
        console.error(`[GPT-Researcher] web-search failed for "${query.slice(0, 40)}": ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      // web-search returns data in 'data' array, not 'results'
      const results = data.data || data.results || [];
      console.log(`[GPT-Researcher] web-search returned ${results.length} results for "${query.slice(0, 40)}"`);
      
      return results.map((result: any) => {
        try {
          return {
            url: result.url,
            title: result.title || 'Untitled',
            domain: result.url ? new URL(result.url).hostname.replace('www.', '') : 'unknown',
            relevanceScore: result.score || 0.7,
            extractedContent: result.description || result.markdown || result.snippet || '',
            publishDate: result.publishDate || result.fetchedAt,
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error(`[GPT-Researcher] Search failed for query: ${query}`, error);
      return [];
    }
  });
  
  const resultsArrays = await Promise.all(searchPromises);
  
  // Combine and deduplicate
  for (const results of resultsArrays) {
    for (const result of results) {
      if (result && result.url && !seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allSources.push(result);
      }
    }
  }

  console.log(`[GPT-Researcher] Total unique sources: ${allSources.length}`);
  return allSources.slice(0, maxSources);
}

// Extract full content from sources using Playwright browser - PARALLEL execution
async function extractContent(sources: SourceInfo[], supabase: { url: string; key: string }): Promise<SourceInfo[]> {
  // Process top sources in parallel (limit to 6 for speed)
  const topSources = sources.slice(0, 6);
  
  const scrapePromises = topSources.map(async (source) => {
    try {
      const response = await fetch(`${supabase.url}/functions/v1/playwright-browser`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: source.url,
          action: 'scrape',
          waitTime: 2000,
        }),
      });

      if (!response.ok) {
        console.log(`[GPT-Researcher] playwright scrape failed for ${source.url}: ${response.status}`);
        return source;
      }
      
      const result = await response.json();
      if (result.success && (result.content || result.markdown)) {
        const content = (result.content || result.markdown || '').slice(0, 8000);
        console.log(`[GPT-Researcher] Scraped ${source.domain}: ${content.length} chars`);
        return {
          ...source,
          extractedContent: content || source.extractedContent,
          author: result.metadata?.author,
          publishDate: result.metadata?.publishDate || source.publishDate,
        };
      }
      return source;
    } catch (error) {
      console.error(`[GPT-Researcher] Content extraction failed for: ${source.url}`, error);
      return source;
    }
  });
  
  const extracted = await Promise.all(scrapePromises);
  
  // Add remaining sources without scraping
  const remaining = sources.slice(6);
  
  console.log(`[GPT-Researcher] Extracted content from ${extracted.filter(s => s.extractedContent.length > 100).length}/${topSources.length} sources`);
  
  return [...extracted, ...remaining];
}

// Verify facts across sources
async function verifyFacts(sources: SourceInfo[], supabase: { url: string; key: string }): Promise<VerifiedFact[]> {
  if (sources.length < 2) return [];

  const combinedContent = sources
    .map(s => `Source: ${s.domain}\n${s.extractedContent.substring(0, 2000)}`)
    .join('\n\n---\n\n');

  try {
    const content = await callLLM(
      supabase,
      `You are a fact verification agent. Analyze the provided sources and identify key claims.
For each claim, determine if it's verified by multiple sources.
Return a JSON object with a "facts" array containing objects with:
- claim: the factual claim
- verified: boolean
- sources: array of domain names that support this claim
- confidence: 0-1 score`,
      combinedContent.substring(0, 15000),
      'reasoning'
    );

    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    return parsed.facts || [];
  } catch (error) {
    console.error('Fact verification failed:', error);
    return [];
  }
}

// Generate comprehensive research report
async function generateReport(
  query: string,
  sources: SourceInfo[],
  facts: VerifiedFact[],
  reportType: string,
  supabase: { url: string; key: string }
): Promise<string> {
  const sourcesSummary = sources
    .map(s => `- ${s.title} (${s.domain}): ${s.extractedContent.substring(0, 500)}...`)
    .join('\n');

  const factsSummary = facts
    .filter(f => f.verified)
    .map(f => `- ${f.claim} (confidence: ${f.confidence.toFixed(2)})`)
    .join('\n');

  const content = await callLLM(
    supabase,
    `You are a research report writer creating a ${reportType}.
Write a comprehensive, well-structured report based on the provided sources and verified facts.
Include citations, key findings, and actionable insights.
Format in clean Markdown with proper headings and sections.`,
    `Research Query: ${query}
          
Sources:
${sourcesSummary}

Verified Facts:
${factsSummary}

Generate a comprehensive ${reportType} that answers the research query.`,
    'synthesis'
  );

  return content;
}
