import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TYPES ============

interface ResearchJob {
  id: string;
  query: string;
  status: 'pending' | 'planning' | 'searching' | 'extracting' | 'analyzing' | 'verifying' | 'compiling' | 'completed' | 'failed';
  progress: number;
  sources: Source[];
  findings: Finding[];
  report?: Report;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface Source {
  id: string;
  url: string;
  domain: string;
  title: string;
  content: string;
  extractedAt: string;
  reliability: number;
  citations: Citation[];
}

interface Citation {
  id: string;
  text: string;
  context: string;
  confidence: number;
}

interface Finding {
  id: string;
  claim: string;
  evidence: string[];
  confidence: number;
  sourceIds: string[];
  contradictions: string[];
  verified: boolean;
}

interface Report {
  id: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  citations: Citation[];
  metadata: {
    totalSources: number;
    verifiedClaims: number;
    confidenceScore: number;
    generatedAt: string;
  };
}

interface ReportSection {
  heading: string;
  content: string;
  citations: string[];
}

// ============ TOOL ADAPTERS ============

class ToolAdapter {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    this.supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  }

  async search(query: string, options: { domain?: string; limit?: number } = {}): Promise<any[]> {
    const tavilyKey = Deno.env.get('TAVILY_API_KEY');
    if (!tavilyKey) {
      console.warn('TAVILY_API_KEY not set, using fallback search');
      return this.fallbackSearch(query);
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: 'advanced',
          max_results: options.limit || 10,
          include_domains: options.domain ? [options.domain] : undefined,
        }),
      });

      if (!response.ok) throw new Error(`Tavily search failed: ${response.status}`);
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return this.fallbackSearch(query);
    }
  }

  private async fallbackSearch(query: string): Promise<any[]> {
    // Use research-search edge function as fallback
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/research-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({ query, maxResults: 10 }),
      });
      
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  async extract(url: string): Promise<{ title: string; content: string; metadata: any }> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/research-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({ url, extractContent: true }),
      });

      if (!response.ok) throw new Error(`Extract failed: ${response.status}`);
      
      const data = await response.json();
      return {
        title: data.title || 'Untitled',
        content: data.content || data.text || '',
        metadata: data.metadata || {},
      };
    } catch (error) {
      console.error('Extract error:', error);
      return { title: 'Failed to extract', content: '', metadata: {} };
    }
  }

  async summarize(text: string, maxLength: number = 500): Promise<string> {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      // Simple extractive summary fallback
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a research summarizer. Provide concise, factual summaries that preserve key claims and evidence. Include specific data points when available.' },
            { role: 'user', content: `Summarize the following text in ${maxLength} characters or less:\n\n${text}` },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Summarize failed: ${response.status}`);
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || text.slice(0, maxLength);
    } catch (error) {
      console.error('Summarize error:', error);
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
  }

  async analyze(query: string, sources: Source[]): Promise<Finding[]> {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return this.basicAnalysis(sources);
    }

    try {
      const sourceSummaries = sources.map(s => `[${s.domain}]: ${s.content.slice(0, 500)}`).join('\n\n');
      
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
              content: `You are a research analyst. Extract key findings from sources. For each finding:
1. State the claim clearly
2. Note supporting evidence
3. Identify contradictions between sources
4. Rate confidence (0-1)

Respond in JSON format: { "findings": [{ "claim": "...", "evidence": ["..."], "contradictions": ["..."], "confidence": 0.8, "sourceIds": ["..."] }] }` 
            },
            { role: 'user', content: `Query: ${query}\n\nSources:\n${sourceSummaries}` },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Analyze failed: ${response.status}`);
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
        return (parsed.findings || []).map((f: any, i: number) => ({
          id: `finding-${Date.now()}-${i}`,
          claim: f.claim || '',
          evidence: f.evidence || [],
          confidence: f.confidence || 0.5,
          sourceIds: f.sourceIds || [],
          contradictions: f.contradictions || [],
          verified: f.confidence > 0.7,
        }));
      } catch {
        return this.basicAnalysis(sources);
      }
    } catch (error) {
      console.error('Analyze error:', error);
      return this.basicAnalysis(sources);
    }
  }

  private basicAnalysis(sources: Source[]): Finding[] {
    // Simple extraction of key sentences as findings
    return sources.slice(0, 5).map((source, i) => ({
      id: `finding-${Date.now()}-${i}`,
      claim: source.content.split('.')[0] + '.',
      evidence: [source.content.slice(0, 200)],
      confidence: source.reliability,
      sourceIds: [source.id],
      contradictions: [],
      verified: false,
    }));
  }

  async generateReport(query: string, findings: Finding[], sources: Source[]): Promise<Report> {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const reportId = `report-${Date.now()}`;
    
    if (!apiKey) {
      return this.basicReport(reportId, query, findings, sources);
    }

    try {
      const findingsSummary = findings.map(f => `- ${f.claim} (confidence: ${(f.confidence * 100).toFixed(0)}%)`).join('\n');
      
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
              content: `You are a research report writer. Create a structured research report with:
1. Executive summary (2-3 sentences)
2. Key findings section
3. Analysis section with evidence
4. Conclusion

Use markdown formatting. Cite sources using [1], [2], etc.` 
            },
            { role: 'user', content: `Query: ${query}\n\nKey Findings:\n${findingsSummary}\n\nNumber of sources: ${sources.length}` },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Report generation failed: ${response.status}`);
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Parse markdown into sections
      const sections = this.parseMarkdownSections(content);
      
      return {
        id: reportId,
        title: `Research Report: ${query}`,
        summary: sections[0]?.content || 'Research completed.',
        sections,
        citations: sources.map((s, i) => ({
          id: `cite-${i}`,
          text: `[${i + 1}] ${s.title}`,
          context: s.url,
          confidence: s.reliability,
        })),
        metadata: {
          totalSources: sources.length,
          verifiedClaims: findings.filter(f => f.verified).length,
          confidenceScore: findings.reduce((acc, f) => acc + f.confidence, 0) / Math.max(findings.length, 1),
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Report generation error:', error);
      return this.basicReport(reportId, query, findings, sources);
    }
  }

  private parseMarkdownSections(markdown: string): ReportSection[] {
    const sections: ReportSection[] = [];
    const lines = markdown.split('\n');
    let currentSection: ReportSection | null = null;
    
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          heading: line.replace(/^#+\s*/, ''),
          content: '',
          citations: [],
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
        // Extract citation references
        const citeMatches = line.match(/\[(\d+)\]/g);
        if (citeMatches) {
          currentSection.citations.push(...citeMatches);
        }
      }
    }
    
    if (currentSection) sections.push(currentSection);
    return sections;
  }

  private basicReport(id: string, query: string, findings: Finding[], sources: Source[]): Report {
    return {
      id,
      title: `Research Report: ${query}`,
      summary: `Research completed with ${sources.length} sources and ${findings.length} findings.`,
      sections: [
        {
          heading: 'Key Findings',
          content: findings.map(f => `- ${f.claim}`).join('\n'),
          citations: [],
        },
        {
          heading: 'Sources',
          content: sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n'),
          citations: [],
        },
      ],
      citations: sources.map((s, i) => ({
        id: `cite-${i}`,
        text: `[${i + 1}] ${s.title}`,
        context: s.url,
        confidence: s.reliability,
      })),
      metadata: {
        totalSources: sources.length,
        verifiedClaims: findings.filter(f => f.verified).length,
        confidenceScore: findings.reduce((acc, f) => acc + f.confidence, 0) / Math.max(findings.length, 1),
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// ============ ORCHESTRATOR ============

class ResearchOrchestrator {
  private tools: ToolAdapter;
  private job: ResearchJob;
  private onProgress?: (job: ResearchJob) => void;

  constructor(query: string, onProgress?: (job: ResearchJob) => void) {
    this.tools = new ToolAdapter();
    this.onProgress = onProgress;
    this.job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query,
      status: 'pending',
      progress: 0,
      sources: [],
      findings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private updateProgress(status: ResearchJob['status'], progress: number) {
    this.job.status = status;
    this.job.progress = progress;
    this.job.updatedAt = new Date().toISOString();
    this.onProgress?.(this.job);
  }

  async execute(): Promise<ResearchJob> {
    try {
      // Step 1: Planning
      this.updateProgress('planning', 5);
      console.log(`[Orchestrator] Planning research for: ${this.job.query}`);
      
      // Step 2: Search
      this.updateProgress('searching', 15);
      console.log(`[Orchestrator] Searching...`);
      
      const searchResults = await this.tools.search(this.job.query, { limit: 15 });
      console.log(`[Orchestrator] Found ${searchResults.length} results`);
      
      // Step 3: Extract content from top results
      this.updateProgress('extracting', 30);
      console.log(`[Orchestrator] Extracting content...`);
      
      const extractPromises = searchResults.slice(0, 8).map(async (result, i) => {
        try {
          const extracted = await this.tools.extract(result.url);
          const source: Source = {
            id: `source-${Date.now()}-${i}`,
            url: result.url,
            domain: new URL(result.url).hostname,
            title: extracted.title || result.title || 'Untitled',
            content: extracted.content || result.content || '',
            extractedAt: new Date().toISOString(),
            reliability: result.score || 0.7,
            citations: [],
          };
          return source;
        } catch (error) {
          console.warn(`Failed to extract ${result.url}:`, error);
          return null;
        }
      });

      const extractedSources = (await Promise.all(extractPromises)).filter(Boolean) as Source[];
      this.job.sources = extractedSources;
      
      this.updateProgress('analyzing', 50);
      console.log(`[Orchestrator] Extracted ${extractedSources.length} sources, analyzing...`);
      
      // Step 4: Analyze and find claims
      this.updateProgress('analyzing', 60);
      const findings = await this.tools.analyze(this.job.query, extractedSources);
      this.job.findings = findings;
      
      // Step 5: Verify findings
      this.updateProgress('verifying', 75);
      console.log(`[Orchestrator] Found ${findings.length} findings, verifying...`);
      
      // Cross-reference findings
      for (const finding of this.job.findings) {
        const supportingSources = this.job.sources.filter(s => 
          s.content.toLowerCase().includes(finding.claim.toLowerCase().split(' ').slice(0, 3).join(' '))
        );
        finding.verified = supportingSources.length >= 2 || finding.confidence > 0.8;
      }
      
      // Step 6: Compile report
      this.updateProgress('compiling', 85);
      console.log(`[Orchestrator] Compiling report...`);
      
      const report = await this.tools.generateReport(this.job.query, this.job.findings, this.job.sources);
      this.job.report = report;
      
      // Complete
      this.updateProgress('completed', 100);
      console.log(`[Orchestrator] Research complete`);
      
      return this.job;
    } catch (error) {
      console.error('[Orchestrator] Error:', error);
      this.job.status = 'failed';
      this.job.error = error instanceof Error ? error.message : 'Unknown error';
      this.job.updatedAt = new Date().toISOString();
      return this.job;
    }
  }

  getJob(): ResearchJob {
    return this.job;
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/research-orchestrator', '');

  try {
    // POST /run - Start a new research job
    if (req.method === 'POST' && (path === '/run' || path === '' || path === '/')) {
      const { query, stream = false } = await req.json();
      
      if (!query || typeof query !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Query is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[API] Starting research for: ${query}`);

      if (stream) {
        // Streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const orchestrator = new ResearchOrchestrator(query, (job) => {
              const event = `data: ${JSON.stringify(job)}\n\n`;
              controller.enqueue(encoder.encode(event));
            });

            try {
              const result = await orchestrator.execute();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (error) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Non-streaming response
        const orchestrator = new ResearchOrchestrator(query);
        const result = await orchestrator.execute();
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET /status/:id - Get job status (placeholder for DB integration)
    if (req.method === 'GET' && path.startsWith('/status/')) {
      const jobId = path.replace('/status/', '');
      // In a full implementation, this would query the database
      return new Response(
        JSON.stringify({ message: 'Job status endpoint - requires DB integration', jobId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found', path }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[API] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
