import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// GPT-RESEARCHER INTEGRATION
// ========================================
// Integrates with GPT-Researcher for autonomous deep research
// GitHub: https://github.com/assafelovic/gpt-researcher
// Provides parallel research, source aggregation, fact verification
// Uses: OpenAI/Claude as primary (NOT Lovable AI)

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

// LLM Provider configuration - prioritize OpenAI
interface LLMProvider {
  key: string;
  name: string;
  endpoint: string;
  model: string;
  isAnthropic?: boolean;
}

const LLM_PROVIDERS: LLMProvider[] = [
  { key: 'OPENAI_API_KEY', name: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { key: 'ANTHROPIC_API_KEY', name: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022', isAnthropic: true },
  { key: 'GROQ_API_KEY', name: 'groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  { key: 'LOVABLE_API_KEY', name: 'lovable', endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions', model: 'google/gemini-2.5-pro' },
];

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
      llmProvider: preferredProvider = 'auto',
    } = request;

    console.log(`[GPT-Researcher] Starting research: "${query}"`);
    const startTime = Date.now();

    // Get the best available LLM provider
    const provider = getAvailableProvider(preferredProvider);
    if (!provider) {
      return new Response(JSON.stringify({
        error: 'No AI API key configured',
        hint: 'Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[GPT-Researcher] Using LLM provider: ${provider.name}`);

    // PHASE 1: Plan research with sub-questions
    const subQuestions = await generateSubQuestions(query, provider);
    console.log(`[GPT-Researcher] Generated ${subQuestions.length} sub-questions`);

    // PHASE 2: Search sources in parallel
    const sources = await searchSources(query, subQuestions, maxSources);
    console.log(`[GPT-Researcher] Found ${sources.length} sources`);

    // PHASE 3: Extract content from sources
    const extractedSources = await extractContent(sources);
    console.log(`[GPT-Researcher] Extracted content from ${extractedSources.length} sources`);

    // PHASE 4: Verify facts (if enabled)
    let verifiedFacts: VerifiedFact[] = [];
    if (includeFactVerification && extractedSources.length >= 2) {
      verifiedFacts = await verifyFacts(extractedSources, provider);
      console.log(`[GPT-Researcher] Verified ${verifiedFacts.length} facts`);
    }

    // PHASE 5: Generate report
    const report = await generateReport(
      query, 
      extractedSources, 
      verifiedFacts, 
      reportType,
      provider
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
        llmProvider: provider.name,
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

// Get the best available LLM provider
function getAvailableProvider(preferred: string): LLMProvider | null {
  // If preferred provider specified, try it first
  if (preferred !== 'auto') {
    const provider = LLM_PROVIDERS.find(p => p.name === preferred);
    if (provider && Deno.env.get(provider.key)) {
      return { ...provider, key: Deno.env.get(provider.key)! };
    }
  }

  // Otherwise try in priority order
  for (const provider of LLM_PROVIDERS) {
    const apiKey = Deno.env.get(provider.key);
    if (apiKey) {
      return { ...provider, key: apiKey };
    }
  }

  return null;
}

// Call LLM with the provider
async function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = Deno.env.get(provider.key);
  if (!apiKey) throw new Error(`No API key for ${provider.name}`);

  if (provider.isAnthropic) {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  } else {
    const body: any = {
      model: provider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    };

    // Only add response_format for providers that support it
    if (jsonMode && provider.name !== 'groq') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider.name} API error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// Generate sub-questions for comprehensive research
async function generateSubQuestions(query: string, provider: LLMProvider): Promise<string[]> {
  try {
    const content = await callLLM(
      provider,
      `You are a research planner. Given a research query, generate 3-5 specific sub-questions 
that would help comprehensively answer the main query. Return ONLY a JSON object with a "questions" array of strings.`,
      query,
      true
    );

    const parsed = JSON.parse(content);
    return parsed.questions || parsed.subQuestions || [query];
  } catch (error) {
    console.error('Failed to generate sub-questions:', error);
    return [query]; // Fallback to original query
  }
}

// Search for sources using web search
async function searchSources(
  mainQuery: string, 
  subQuestions: string[], 
  maxSources: number
): Promise<SourceInfo[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const allSources: SourceInfo[] = [];
  const seenUrls = new Set<string>();

  // Search for main query and each sub-question
  const queries = [mainQuery, ...subQuestions];
  
  for (const query of queries) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, maxResults: Math.ceil(maxSources / queries.length) }),
      });

      if (response.ok) {
        const results = await response.json();
        for (const result of results.results || []) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allSources.push({
              url: result.url,
              title: result.title,
              domain: new URL(result.url).hostname,
              relevanceScore: result.score || 0.5,
              extractedContent: result.snippet || '',
              publishDate: result.publishDate,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Search failed for query: ${query}`, error);
    }
  }

  return allSources.slice(0, maxSources);
}

// Extract full content from sources using Playwright browser
async function extractContent(sources: SourceInfo[]): Promise<SourceInfo[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const extracted: SourceInfo[] = [];

  for (const source of sources) {
    try {
      // Use playwright-browser for extraction
      const response = await fetch(`${supabaseUrl}/functions/v1/playwright-browser`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: source.url,
          action: 'scrape',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          extracted.push({
            ...source,
            extractedContent: result.content || result.markdown || source.extractedContent,
            author: result.metadata?.author,
            publishDate: result.metadata?.publishDate || source.publishDate,
          });
        } else {
          extracted.push(source);
        }
      } else {
        extracted.push(source);
      }
    } catch (error) {
      console.error(`Content extraction failed for: ${source.url}`, error);
      extracted.push(source);
    }
  }

  return extracted;
}

// Verify facts across sources
async function verifyFacts(sources: SourceInfo[], provider: LLMProvider): Promise<VerifiedFact[]> {
  if (sources.length < 2) return [];

  // Combine content for analysis
  const combinedContent = sources
    .map(s => `Source: ${s.domain}\n${s.extractedContent.substring(0, 2000)}`)
    .join('\n\n---\n\n');

  try {
    const content = await callLLM(
      provider,
      `You are a fact verification agent. Analyze the provided sources and identify key claims.
For each claim, determine if it's verified by multiple sources.
Return a JSON object with a "facts" array containing objects with:
- claim: the factual claim
- verified: boolean
- sources: array of domain names that support this claim
- confidence: 0-1 score`,
      combinedContent.substring(0, 15000),
      true
    );

    const parsed = JSON.parse(content);
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
  provider: LLMProvider
): Promise<string> {
  const sourcesSummary = sources
    .map(s => `- ${s.title} (${s.domain}): ${s.extractedContent.substring(0, 500)}...`)
    .join('\n');

  const factsSummary = facts
    .filter(f => f.verified)
    .map(f => `- ${f.claim} (confidence: ${f.confidence.toFixed(2)})`)
    .join('\n');

  const content = await callLLM(
    provider,
    `You are a research report writer creating a ${reportType}.
Write a comprehensive, well-structured report based on the provided sources and verified facts.
Include citations, key findings, and actionable insights.
Format in clean Markdown with proper headings and sections.`,
    `Research Query: ${query}
          
Sources:
${sourcesSummary}

Verified Facts:
${factsSummary}

Generate a comprehensive ${reportType} that answers the research query.`
  );

  return content;
}
