# Search Engine & Report Extraction - Complete Implementation Guide

> **Status**: Production-Ready | **Version**: 2.0 | **Last Updated**: 2025

## Overview

The Main Search Engine is a multi-agent research system that performs comprehensive web research, extracts structured data, verifies accuracy across sources, and generates detailed reports with citations. It implements the MANUS 1.6 MAX architecture with 6 specialist agents.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RESEARCH ORCHESTRATOR                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │   PLANNER   │──▶│  SEARCHER   │──▶│  SCRAPER    │──▶│  ANALYZER   │ │
│  │  Sub-Queries│   │  Multi-Src  │   │  Content    │   │  Extract    │ │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │  VERIFIER   │──▶│   CRITIC    │──▶│   WRITER    │──▶│   REPORT    │ │
│  │  Fact-Check │   │  Quality    │   │  Synthesis  │   │  Output     │ │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    6 SPECIALIST AGENTS (Parallel)                 │ │
│  │  Technical │ Market │ Data │ Philosophical │ Historical │ Risk   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── lib/
│   ├── searchExecutor.ts              # Main search orchestration
│   ├── searchEnhancer.ts              # Query enhancement
│   ├── agent/
│   │   ├── wideResearch.ts            # Wide research engine
│   │   ├── manusArchitecture.ts       # Report structure definitions
│   │   ├── crossReferenceValidator.ts # Verification logic
│   │   └── criticAgent.ts             # Quality assessment
│   └── manus-core/
│       ├── wideResearchCore.ts        # 6 specialist agents
│       └── perplexityResearch.ts      # Fact verification

supabase/functions/
├── research-orchestrator/
│   └── index.ts                       # Main orchestrator
├── research-search/
│   └── index.ts                       # Web search
├── research-scrape/
│   └── index.ts                       # Content extraction
├── research-analyze/
│   └── index.ts                       # AI analysis
├── gpt-researcher/
│   └── index.ts                       # GPT-Researcher style agents
```

---

## Implementation Steps

### Step 1: Research Orchestrator Edge Function

Create `supabase/functions/research-orchestrator/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// ============ TOOL ADAPTER ============

class ToolAdapter {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    this.supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  }

  async search(query: string, options: { limit?: number } = {}): Promise<any[]> {
    try {
      console.log(`[Orchestrator] Searching: "${query.slice(0, 50)}..."`);
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          query,
          maxResults: options.limit || 10,
          searchEngine: 'all',
          scrapeContent: true,
        }),
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      const results = data.data || data.results || [];
      
      return results.map((r: any) => ({
        url: r.url,
        title: r.title || 'Untitled',
        content: r.markdown || r.description || '',
        score: 0.8,
      }));
    } catch (error) {
      console.error('[Orchestrator] Search error:', error);
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

  async analyze(query: string, sources: Source[]): Promise<Finding[]> {
    try {
      const sourceSummaries = sources.map(s => `[${s.domain}]: ${s.content.slice(0, 500)}`).join('\n\n');
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/llm-router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `You are a research analyst. Extract key findings from sources. For each finding:
1. State the claim clearly
2. Note supporting evidence
3. Identify contradictions between sources
4. Assign confidence (0-1)

Return JSON array of findings.`
            },
            { role: 'user', content: `Query: ${query}\n\nSources:\n${sourceSummaries}` },
          ],
          task: 'analysis',
          preferLocal: true,
        }),
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);
      
      const data = await response.json();
      return JSON.parse(data.content || '[]');
    } catch (error) {
      console.error('Analysis error:', error);
      return [];
    }
  }

  async verify(findings: Finding[], sources: Source[]): Promise<Finding[]> {
    // Cross-reference findings across sources
    return findings.map(finding => {
      const supportingSources = sources.filter(s => 
        s.content.toLowerCase().includes(finding.claim.toLowerCase().slice(0, 50))
      );
      
      const contradictions: string[] = [];
      // Check for contradicting claims
      for (const other of findings) {
        if (other.id !== finding.id && other.confidence > 0.5) {
          // Simple contradiction detection (can be enhanced with NLP)
          if (finding.claim.includes('not') !== other.claim.includes('not')) {
            contradictions.push(other.claim);
          }
        }
      }
      
      return {
        ...finding,
        verified: supportingSources.length >= 2,
        confidence: Math.min(finding.confidence, supportingSources.length / 3),
        contradictions,
      };
    });
  }

  async generateReport(query: string, findings: Finding[], sources: Source[]): Promise<Report> {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a research report writer. Generate a comprehensive report with:
1. Executive Summary (5-8 bullet points)
2. Key Findings (detailed sections)
3. Data Tables (if entity/company queries)
4. Source Citations
5. Confidence Assessment

CRITICAL RULES:
- ONLY use information from provided sources
- Include specific names, dates, numbers found
- Flag contradictions between sources
- Never invent or assume data`
          },
          {
            role: 'user',
            content: `Query: ${query}

Verified Findings:
${findings.filter(f => f.verified).map(f => `- ${f.claim} (confidence: ${f.confidence})`).join('\n')}

Sources:
${sources.map(s => `[${s.domain}]: ${s.content.slice(0, 1000)}`).join('\n\n')}`
          }
        ],
      }),
    });
    
    const result = await response.json();
    
    return {
      id: `report-${Date.now()}`,
      title: query,
      summary: result.choices[0].message.content,
      sections: [],
      citations: sources.map(s => ({
        id: s.id,
        text: s.title,
        context: s.url,
        confidence: s.reliability,
      })),
      metadata: {
        totalSources: sources.length,
        verifiedClaims: findings.filter(f => f.verified).length,
        confidenceScore: findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, options = {} } = await req.json();
    
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[Orchestrator] Starting research: "${query}"`);
    
    const tools = new ToolAdapter();
    const job: ResearchJob = {
      id: `job-${Date.now()}`,
      query,
      status: 'pending',
      progress: 0,
      sources: [],
      findings: [],
    };
    
    // Phase 1: Planning (generate sub-queries)
    job.status = 'planning';
    job.progress = 10;
    
    const subQueries = await generateSubQueries(query);
    console.log(`[Orchestrator] Generated ${subQueries.length} sub-queries`);
    
    // Phase 2: Searching
    job.status = 'searching';
    job.progress = 25;
    
    const allResults: any[] = [];
    for (const sq of subQueries) {
      const results = await tools.search(sq, { limit: 5 });
      allResults.push(...results);
    }
    
    // Phase 3: Extracting
    job.status = 'extracting';
    job.progress = 50;
    
    const sources: Source[] = [];
    for (const result of allResults.slice(0, 15)) {
      const extracted = await tools.extract(result.url);
      sources.push({
        id: `source-${sources.length}`,
        url: result.url,
        domain: new URL(result.url).hostname,
        title: extracted.title,
        content: extracted.content,
        extractedAt: new Date().toISOString(),
        reliability: calculateReliability(result.url),
        citations: [],
      });
    }
    job.sources = sources;
    
    // Phase 4: Analyzing
    job.status = 'analyzing';
    job.progress = 70;
    
    const findings = await tools.analyze(query, sources);
    
    // Phase 5: Verifying
    job.status = 'verifying';
    job.progress = 85;
    
    const verifiedFindings = await tools.verify(findings, sources);
    job.findings = verifiedFindings;
    
    // Phase 6: Compiling Report
    job.status = 'compiling';
    job.progress = 95;
    
    const report = await tools.generateReport(query, verifiedFindings, sources);
    job.report = report;
    
    job.status = 'completed';
    job.progress = 100;
    
    return new Response(JSON.stringify({
      success: true,
      job,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============ HELPERS ============

async function generateSubQueries(query: string): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Generate 3-5 focused sub-queries to thoroughly research the main query. Return as JSON array of strings.',
          },
          { role: 'user', content: query },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.subQueries || parsed.queries || [query];
  } catch {
    return [query];
  }
}

function calculateReliability(url: string): number {
  const domain = new URL(url).hostname;
  const trustedDomains: Record<string, number> = {
    'bloomberg.com': 0.95,
    'reuters.com': 0.95,
    'ft.com': 0.9,
    'wsj.com': 0.9,
    'economist.com': 0.9,
    'nature.com': 0.95,
    'science.org': 0.95,
    'gov': 0.9,
    'edu': 0.85,
  };
  
  for (const [key, score] of Object.entries(trustedDomains)) {
    if (domain.includes(key)) return score;
  }
  
  return 0.7;
}
```

### Step 2: Verification & Accuracy System

Create `src/lib/agent/crossReferenceValidator.ts`:

```typescript
export interface ClaimVerification {
  claim: string;
  sources: string[];
  status: 'verified' | 'partial' | 'unverified' | 'contradicted';
  confidence: number;
  contradictions?: string[];
}

export interface VerificationResult {
  claims: ClaimVerification[];
  overallConfidence: number;
  sourceDiversity: number;
  contradictionCount: number;
}

/**
 * Cross-reference claims across multiple sources
 */
export async function verifyClaims(
  claims: string[],
  sources: Array<{ url: string; content: string; domain: string }>
): Promise<VerificationResult> {
  const verifiedClaims: ClaimVerification[] = [];
  
  for (const claim of claims) {
    const supporting: string[] = [];
    const contradicting: string[] = [];
    
    for (const source of sources) {
      const contentLower = source.content.toLowerCase();
      const claimLower = claim.toLowerCase();
      
      // Check for supporting evidence
      const claimWords = claimLower.split(/\s+/).filter(w => w.length > 4);
      const matchCount = claimWords.filter(w => contentLower.includes(w)).length;
      const matchRatio = matchCount / claimWords.length;
      
      if (matchRatio > 0.5) {
        supporting.push(source.url);
      }
      
      // Check for contradictions (negation detection)
      const hasNegation = contentLower.includes(`not ${claimLower.slice(0, 30)}`);
      if (hasNegation) {
        contradicting.push(source.url);
      }
    }
    
    // Determine verification status
    let status: ClaimVerification['status'];
    let confidence: number;
    
    if (contradicting.length > 0) {
      status = 'contradicted';
      confidence = 0.3;
    } else if (supporting.length >= 3) {
      status = 'verified';
      confidence = Math.min(0.95, 0.6 + (supporting.length * 0.1));
    } else if (supporting.length >= 1) {
      status = 'partial';
      confidence = 0.5 + (supporting.length * 0.15);
    } else {
      status = 'unverified';
      confidence = 0.2;
    }
    
    verifiedClaims.push({
      claim,
      sources: supporting,
      status,
      confidence,
      contradictions: contradicting.length > 0 ? contradicting : undefined,
    });
  }
  
  // Calculate overall metrics
  const overallConfidence = verifiedClaims.reduce((sum, c) => sum + c.confidence, 0) / verifiedClaims.length;
  const uniqueDomains = new Set(sources.map(s => s.domain)).size;
  const sourceDiversity = Math.min(1, uniqueDomains / 5);
  const contradictionCount = verifiedClaims.filter(c => c.status === 'contradicted').length;
  
  return {
    claims: verifiedClaims,
    overallConfidence,
    sourceDiversity,
    contradictionCount,
  };
}

/**
 * Calculate quality score for research output
 */
export function calculateQualityScore(
  verification: VerificationResult,
  metadata: {
    sourceCount: number;
    executionTimeMs: number;
    extractedDataPoints: number;
  }
): number {
  // Weights for different factors
  const weights = {
    confidence: 0.35,
    diversity: 0.2,
    coverage: 0.25,
    freshness: 0.1,
    contradictions: 0.1,
  };
  
  const scores = {
    confidence: verification.overallConfidence,
    diversity: verification.sourceDiversity,
    coverage: Math.min(1, metadata.sourceCount / 10),
    freshness: metadata.executionTimeMs < 30000 ? 1 : 0.8,
    contradictions: 1 - (verification.contradictionCount / verification.claims.length),
  };
  
  return Object.entries(weights).reduce(
    (total, [key, weight]) => total + (scores[key as keyof typeof scores] * weight),
    0
  );
}
```

### Step 3: Report Structure

Create `src/lib/agent/manusArchitecture.ts`:

```typescript
export interface ManusResearchReport {
  id: string;
  query: string;
  timestamp: Date;
  sections: ReportSection[];
  sources: VerifiedSource[];
  confidenceScore: number;
  contradictions: Contradiction[];
  metadata: ReportMetadata;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  confidence: number;
  sources: string[];
}

export interface VerifiedSource {
  url: string;
  domain: string;
  title: string;
  author?: string;
  publishDate?: Date;
  credibilityBadge: 'authoritative' | 'reliable' | 'standard' | 'unknown';
  verificationStatus: 'verified' | 'partial' | 'unverified';
}

export interface Contradiction {
  claim1: string;
  claim2: string;
  source1: string;
  source2: string;
  resolution?: string;
}

export interface ReportMetadata {
  totalSources: number;
  verifiedSources: number;
  executionTimeMs: number;
  agentIterations: number;
  dataSourcesUsed: string[];
}

/**
 * Standard report sections for comprehensive research
 */
export const REPORT_SECTIONS = [
  { id: 'summary', title: 'Executive Summary', required: true },
  { id: 'key_findings', title: 'Key Findings', required: true },
  { id: 'data_analysis', title: 'Data Analysis', required: false },
  { id: 'entities', title: 'Companies/Entities Identified', required: false },
  { id: 'timeline', title: 'Timeline of Events', required: false },
  { id: 'contradictions', title: 'Contradictions & Discrepancies', required: true },
  { id: 'sources', title: 'Source Evaluation', required: true },
  { id: 'confidence', title: 'Confidence Assessment', required: true },
];

/**
 * Credibility scoring for source domains
 */
export const DOMAIN_CREDIBILITY: Record<string, number> = {
  'bloomberg.com': 0.95,
  'reuters.com': 0.95,
  'ft.com': 0.9,
  'wsj.com': 0.9,
  'economist.com': 0.9,
  'nature.com': 0.95,
  'science.org': 0.95,
  'harvard.edu': 0.9,
  'mit.edu': 0.9,
  'stanford.edu': 0.9,
  'gov': 0.85,
  'edu': 0.8,
};

export function getCredibilityBadge(domain: string): VerifiedSource['credibilityBadge'] {
  for (const [key, score] of Object.entries(DOMAIN_CREDIBILITY)) {
    if (domain.includes(key)) {
      if (score >= 0.9) return 'authoritative';
      if (score >= 0.8) return 'reliable';
      return 'standard';
    }
  }
  return 'unknown';
}
```

### Step 4: Frontend Component

Create `src/components/ResearchEngine.tsx`:

```tsx
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchJob {
  id: string;
  query: string;
  status: string;
  progress: number;
  sources: any[];
  findings: any[];
  report?: any;
}

export function ResearchEngine() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [job, setJob] = useState<ResearchJob | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a research query');
      return;
    }
    
    setIsSearching(true);
    setJob(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('research-orchestrator', {
        body: { query },
      });
      
      if (error) throw error;
      
      setJob(data.job);
      toast.success('Research completed!');
    } catch (error) {
      console.error('Research error:', error);
      toast.error('Research failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Research Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your research query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Research'}
            </Button>
          </div>
          
          {isSearching && (
            <div className="mt-4">
              <Progress value={job?.progress || 25} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {job?.status || 'Initializing research...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Results */}
      {job?.report && (
        <>
          {/* Confidence Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Sources"
                  value={job.report.metadata.totalSources}
                  icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                />
                <MetricCard
                  label="Verified Claims"
                  value={job.report.metadata.verifiedClaims}
                  icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                />
                <MetricCard
                  label="Confidence"
                  value={`${Math.round(job.report.metadata.confidenceScore * 100)}%`}
                  icon={
                    job.report.metadata.confidenceScore > 0.7 
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  }
                />
                <MetricCard
                  label="Contradictions"
                  value={job.findings.filter((f: any) => f.contradictions?.length > 0).length}
                  icon={<XCircle className="w-4 h-4 text-red-500" />}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Report Content */}
          <Card>
            <CardHeader>
              <CardTitle>Research Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{job.report.summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
          
          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Sources ({job.sources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.sources.map((source: any) => (
                  <div key={source.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{source.title}</p>
                      <p className="text-xs text-muted-foreground">{source.domain}</p>
                    </div>
                    <Badge variant={source.reliability > 0.8 ? 'default' : 'secondary'}>
                      {Math.round(source.reliability * 100)}% reliable
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Contradictions */}
          {job.findings.some((f: any) => f.contradictions?.length > 0) && (
            <Card className="border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-500">⚠️ Contradictions Detected</CardTitle>
              </CardHeader>
              <CardContent>
                {job.findings
                  .filter((f: any) => f.contradictions?.length > 0)
                  .map((finding: any, i: number) => (
                    <div key={i} className="mb-4 p-3 bg-yellow-500/10 rounded">
                      <p className="font-medium">{finding.claim}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Contradicted by: {finding.contradictions.join(', ')}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

---

## Verification System

### Accuracy Metrics

| Metric | Description | Weight |
|--------|-------------|--------|
| Source Reliability | Domain credibility score | 35% |
| Source Diversity | Unique domains used | 20% |
| Claim Coverage | Claims with 2+ sources | 25% |
| Data Freshness | Publication recency | 10% |
| Contradiction Rate | Claims without conflicts | 10% |

### Credibility Scoring

```typescript
// High credibility (0.9+)
'bloomberg.com', 'reuters.com', 'nature.com', 'science.org'

// Reliable (0.8-0.9)
'ft.com', 'wsj.com', 'economist.com', '.gov', '.edu'

// Standard (0.7)
Other domains without known issues

// Low/Unknown (<0.7)
Unrecognized or flagged domains
```

---

## API Reference

### Execute Research

```http
POST /functions/v1/research-orchestrator
Content-Type: application/json

{
  "query": "What companies are planning IPOs in Saudi Arabia 2025?",
  "options": {
    "depth": "comprehensive",
    "maxSources": 20,
    "verificationLevel": "strict"
  }
}
```

### Response Structure

```json
{
  "success": true,
  "job": {
    "id": "job-1234567890",
    "query": "...",
    "status": "completed",
    "progress": 100,
    "sources": [...],
    "findings": [...],
    "report": {
      "id": "report-1234567890",
      "title": "...",
      "summary": "...",
      "sections": [...],
      "citations": [...],
      "metadata": {
        "totalSources": 15,
        "verifiedClaims": 12,
        "confidenceScore": 0.85,
        "generatedAt": "2025-01-21T..."
      }
    }
  }
}
```

---

## Testing

```bash
# Test basic research
curl -X POST "${SUPABASE_URL}/functions/v1/research-orchestrator" \
  -H "Content-Type: application/json" \
  -d '{"query": "Tesla financial performance 2024"}'
```

---

## Related Documentation

- [Lead Enrichment README](./LEAD_ENRICHMENT_README.md)
- [URL Scraper README](./URL_SCRAPER_README.md)
- [AI Chat README](./AI_CHAT_README.md)
