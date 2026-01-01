// Research Agent - Main orchestrator that coordinates all agent components
// Enhanced with Manus-inspired validation and consolidation

import { AgentStateMachine, agentStateMachine } from './stateMachine';
import { PlanningAgent, planningAgent } from './planningAgent';
import { CriticAgent, criticAgent } from './criticAgent';
import { MemorySystem, memorySystem } from './memorySystem';
import { DecisionEngine, decisionEngine } from './decisionEngine';
import { ParallelExecutor, parallelExecutor } from './parallelExecutor';
import { sourceAuthorityManager } from './sourceAuthority';
import { dataConsolidator, ConsolidatedResult } from './dataConsolidator';
import { 
  AgentState, 
  ResearchPlan, 
  QualityScore, 
  AgentError,
  DecisionContext,
  ExecutionMetrics,
  ClaimVerification,
  VerificationSource,
  FieldConfidence,
  ExtractedData
} from './types';
import { researchApi } from '@/lib/api/research';
import { DeepVerifySourceConfig, ReportFormat } from '@/store/researchStore';

export interface AgentResearchResult {
  id: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  relevanceScore: number;
  extractedAt: Date;
  metadata: {
    author?: string;
    publishDate?: string;
    wordCount?: number;
    domain?: string;
  };
  fieldConfidences?: FieldConfidence[];
}

export interface ResearchAgentCallbacks {
  onStateChange?: (state: AgentState, context: DecisionContext) => void;
  onProgress?: (progress: number) => void;
  onQualityUpdate?: (quality: QualityScore) => void;
  onMetricsUpdate?: (metrics: ExecutionMetrics) => void;
  onResultsUpdate?: (results: AgentResearchResult[]) => void;
  onDecision?: (decision: string, confidence: number) => void;
  onError?: (error: AgentError) => void;
  onPlanUpdate?: (plan: ResearchPlan) => void;
  onVerificationUpdate?: (verifications: ClaimVerification[]) => void;
  onDeepVerifySourceUpdate?: (name: string, status: string, pagesFound?: number) => void;
}

export class ResearchAgent {
  private stateMachine: AgentStateMachine;
  private planner: PlanningAgent;
  private critic: CriticAgent;
  private memory: MemorySystem;
  private decisionEngine: DecisionEngine;
  private executor: ParallelExecutor;
  private callbacks: ResearchAgentCallbacks = {};
  private startTime: number = 0;
  private results: AgentResearchResult[] = [];
  private verifications: ClaimVerification[] = [];
  private currentPlan: ResearchPlan | null = null;
  private isRunning: boolean = false;
  private reportFormat: ReportFormat = 'detailed';

  constructor() {
    this.stateMachine = agentStateMachine;
    this.planner = planningAgent;
    this.critic = criticAgent;
    this.memory = memorySystem;
    this.decisionEngine = decisionEngine;
    this.executor = parallelExecutor;

    // Subscribe to state changes
    this.stateMachine.subscribe((state, context) => {
      this.callbacks.onStateChange?.(state, context);
    });

    // Subscribe to execution metrics
    this.executor.subscribe((metrics) => {
      this.callbacks.onMetricsUpdate?.(metrics);
    });
  }

  setCallbacks(callbacks: ResearchAgentCallbacks): void {
    this.callbacks = callbacks;
  }

  async execute(
    query: string,
    deepVerifyEnabled: boolean = false,
    enabledSources: DeepVerifySourceConfig[] = [],
    reportFormat: ReportFormat = 'detailed',
    options?: {
      country?: string; // UI country filter value (e.g. "saudi-arabia")
      strictMode?: { enabled: boolean; minSources: number };
    }
  ): Promise<{
    results: AgentResearchResult[];
    report: string;
    quality: QualityScore;
    verifications: ClaimVerification[];
    plan: ResearchPlan;
  }> {
    this.isRunning = true;
    this.startTime = Date.now();
    this.results = [];
    this.verifications = [];
    this.stateMachine.reset();
    this.executor.reset();

    console.log(`[ResearchAgent] ========== STARTING MANUS RESEARCH ENGINE ==========`);
    console.log(`[ResearchAgent] Query: "${query}"`);
    console.log(`[ResearchAgent] Mode: Orchestrator (Search → Extract → Analyze → Verify)`);
    console.log(`[ResearchAgent] Format: ${reportFormat}`);
    
    this.reportFormat = reportFormat;

    try {
      // Phase 1: Planning
      console.log(`[ResearchAgent] 📋 Phase 1: PLANNING`);
      await this.stateMachine.transition('planning');
      this.callbacks.onProgress?.(5);
      this.callbacks.onDecision?.('Creating adaptive research plan', 0.9);

      this.currentPlan = await this.planner.createPlan(query, deepVerifyEnabled);
      console.log(`[ResearchAgent] Plan created:`, this.currentPlan);
      this.callbacks.onPlanUpdate?.(this.currentPlan);
      this.stateMachine.updateContext({ plan: this.currentPlan });

      // Phase 2: Execute via Research Orchestrator (Real Search + Extraction)
      console.log(`[ResearchAgent] 🔍 Phase 2: EXECUTING RESEARCH ORCHESTRATOR`);
      await this.stateMachine.transition('searching');
      this.callbacks.onProgress?.(15);
      this.callbacks.onDecision?.('Running research orchestrator (search → extract → analyze)', 0.9);

      // Call the research-orchestrator edge function for REAL research
      const orchestratorResult = await this.executeResearchOrchestrator(query);
      
      if (!orchestratorResult.success) {
        throw new Error(orchestratorResult.error || 'Research orchestrator failed');
      }

      // Convert orchestrator results to agent results
      this.results = this.convertOrchestratorResults(orchestratorResult.data);
      console.log(`[ResearchAgent] Orchestrator returned ${this.results.length} sources`);
      
      this.stateMachine.updateContext({ results: this.results });
      this.callbacks.onResultsUpdate?.(this.results);

      // Phase 3: Analysis (from orchestrator findings)
      console.log(`[ResearchAgent] 🔍 Phase 3: ANALYSIS`);
      await this.stateMachine.transition('analyzing');
      this.callbacks.onProgress?.(50);
      this.callbacks.onDecision?.('Analyzing extracted findings', 0.82);

      const analysisQuality = this.calculateOrchestratorQuality(orchestratorResult.data);
      console.log(`[ResearchAgent] Analysis quality:`, analysisQuality);
      this.stateMachine.updateQuality(analysisQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 4: Verification (from orchestrator)
      console.log(`[ResearchAgent] ✅ Phase 4: VERIFICATION`);
      await this.stateMachine.transition('verifying');
      this.callbacks.onProgress?.(70);
      this.callbacks.onDecision?.('Cross-referencing findings across sources', 0.78);

      this.verifications = this.convertOrchestratorVerifications(orchestratorResult.data);
      console.log(`[ResearchAgent] Verification complete. Claims verified: ${this.verifications.length}`);
      this.callbacks.onVerificationUpdate?.(this.verifications);

      const verificationQuality = this.calculateVerificationQuality();
      this.stateMachine.updateQuality(verificationQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 5: Compile Report (use orchestrator's report)
      console.log(`[ResearchAgent] 📝 Phase 5: COMPILING REPORT`);
      await this.stateMachine.transition('compiling');
      this.callbacks.onProgress?.(85);
      this.callbacks.onDecision?.('Compiling research report from verified findings', 0.92);

      const report = this.extractOrchestratorReport(orchestratorResult.data, query);
      console.log(`[ResearchAgent] Report compiled. Length: ${report.length} characters`);

      // Complete
      console.log(`[ResearchAgent] 🎉 Phase 6: COMPLETING`);
      await this.stateMachine.transition('completed');
      this.callbacks.onProgress?.(100);

      const finalQuality = this.stateMachine.getContext().quality;
      console.log(`[ResearchAgent] ========== RESEARCH COMPLETE ==========`);
      console.log(`[ResearchAgent] Final quality: ${(finalQuality.overall * 100).toFixed(1)}%`);
      console.log(`[ResearchAgent] Sources: ${this.results.length}`);
      console.log(`[ResearchAgent] Time elapsed: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
      
      this.memory.recordOutcome(
        query,
        this.currentPlan,
        finalQuality,
        this.results.map(r => ({
          url: r.url,
          domain: r.metadata.domain || new URL(r.url).hostname,
          useful: r.relevanceScore > 0.5
        })),
        finalQuality.overall >= 0.6
      );

      return {
        results: this.results,
        report,
        quality: finalQuality,
        verifications: this.verifications,
        plan: this.currentPlan
      };
    } catch (error) {
      console.error(`[ResearchAgent] ❌ ERROR:`, error);
      const agentError: AgentError = {
        id: `error-${Date.now()}`,
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
        timestamp: new Date()
      };

      await this.stateMachine.handleError(agentError);
      this.callbacks.onError?.(agentError);

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Execute the research-orchestrator edge function
  private async executeResearchOrchestrator(query: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      console.log(`[ResearchAgent] Calling research-orchestrator for: "${query}"`);

      const response = await fetch(`${supabaseUrl}/functions/v1/research-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ResearchAgent] Orchestrator error: ${response.status} - ${errorText}`);
        return { success: false, error: `Orchestrator returned ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      console.log(`[ResearchAgent] Orchestrator response:`, data);

      if (data.status === 'failed') {
        return { success: false, error: data.error || 'Research failed' };
      }

      return { success: true, data };
    } catch (error) {
      console.error(`[ResearchAgent] Orchestrator call failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Convert orchestrator results to AgentResearchResult format
  private convertOrchestratorResults(data: any): AgentResearchResult[] {
    if (!data?.sources || !Array.isArray(data.sources)) {
      console.warn('[ResearchAgent] No sources in orchestrator response');
      return [];
    }

    return data.sources.map((source: any, index: number) => ({
      id: source.id || `source-${Date.now()}-${index}`,
      title: source.title || 'Untitled Source',
      url: source.url || '',
      content: source.content || '',
      summary: source.content?.slice(0, 300) || '',
      relevanceScore: source.reliability || 0.7,
      extractedAt: new Date(source.extractedAt || Date.now()),
      metadata: {
        domain: source.domain || (source.url ? new URL(source.url).hostname : 'unknown'),
        wordCount: source.content?.split(/\s+/).length || 0,
        publishDate: source.extractedAt,
      }
    }));
  }

  // Convert orchestrator findings to ClaimVerification format
  private convertOrchestratorVerifications(data: any): ClaimVerification[] {
    if (!data?.findings || !Array.isArray(data.findings)) {
      return [];
    }

    return data.findings.map((finding: any) => ({
      claim: finding.claim || '',
      status: finding.verified ? 'verified' : 'unverified',
      confidence: finding.confidence || 0.5,
      sources: (finding.sourceIds || []).map((id: string) => ({
        url: id,
        domain: 'source',
        supportLevel: finding.confidence > 0.7 ? 'strong' : 'moderate',
        excerpt: finding.evidence?.[0] || ''
      })),
      contradictions: finding.contradictions || [],
      verifiedAt: new Date()
    }));
  }

  // Calculate quality from orchestrator data
  private calculateOrchestratorQuality(data: any): Partial<QualityScore> {
    const sourceCount = data?.sources?.length || 0;
    const findingsCount = data?.findings?.length || 0;
    const verifiedCount = data?.findings?.filter((f: any) => f.verified).length || 0;
    const avgConfidence = data?.report?.metadata?.confidenceScore || 0.5;

    return {
      completeness: Math.min(1, sourceCount / 5), // 5 sources = 100%
      sourceQuality: Math.min(1, sourceCount > 0 ? 0.7 + (verifiedCount / findingsCount) * 0.3 : 0.3),
      accuracy: avgConfidence,
      freshness: 0.8, // Real sources are fresh
      overall: Math.min(1, (sourceCount / 5 + avgConfidence + (verifiedCount / Math.max(findingsCount, 1))) / 3)
    };
  }

  // Extract report from orchestrator response
  private extractOrchestratorReport(data: any, query: string): string {
    if (data?.report) {
      const report = data.report;
      let markdown = `# ${report.title || `Research Report: ${query}`}\n\n`;
      
      if (report.summary) {
        markdown += `## Executive Summary\n\n${report.summary}\n\n`;
      }

      if (report.sections && Array.isArray(report.sections)) {
        for (const section of report.sections) {
          markdown += `## ${section.heading}\n\n${section.content}\n\n`;
        }
      }

      if (report.metadata) {
        markdown += `---\n\n**Research Metadata:**\n`;
        markdown += `- Sources analyzed: ${report.metadata.totalSources || 0}\n`;
        markdown += `- Verified claims: ${report.metadata.verifiedClaims || 0}\n`;
        markdown += `- Confidence score: ${((report.metadata.confidenceScore || 0) * 100).toFixed(1)}%\n`;
        markdown += `- Generated: ${report.metadata.generatedAt || new Date().toISOString()}\n`;
      }

      return markdown;
    }

    // Fallback if no report in response
    return `# Research Report: ${query}\n\nResearch completed with ${data?.sources?.length || 0} sources.\n\n` +
           `## Findings\n\n${data?.findings?.map((f: any) => `- ${f.claim}`).join('\n') || 'No findings extracted.'}`;
  }

  // Perform web search using hybrid approach (Tavily + sitemap discovery)
  private async performWebSearch(
    query: string,
    options?: {
      country?: string;
      strictMode?: { enabled: boolean; minSources: number };
    }
  ): Promise<AgentResearchResult[]> {
    try {
      console.log('[ResearchAgent] Performing HYBRID web search for:', query);

      const strictEnabled = options?.strictMode?.enabled === true;
      const minSources = Math.max(1, options?.strictMode?.minSources ?? 2);
      const countryCode = this.normalizeCountryToCode(options?.country);
      const isSaudi = this.isSaudiQuery(query, countryCode);

      // Determine topic for Tavily based on query
      const topic = this.detectTavilyTopic(query);
      
      // Use hybrid search: Tavily for broad discovery + sitemap for authoritative sources
      const searchResult = await researchApi.hybridSearch(query, {
        useTavily: true,
        useSitemap: true,
        tavilyOptions: {
          searchDepth: 'advanced',
          topic,
          days: 30,
          maxResults: 10,
        },
        sitemapOptions: {
          limit: 10,
          strictMode: isSaudi ? strictEnabled : false,
          country: isSaudi ? 'sa' : undefined,
        }
      });
      
      // Handle strict mode failure
      if (searchResult.strictModeFailure) {
        console.error('[ResearchAgent] STRICT MODE FAILURE:', searchResult.error);
        console.error('[ResearchAgent] Unreachable sources:', searchResult.unreachableSources);
        throw new Error(`Research failed: ${searchResult.error}. Unreachable sources: ${searchResult.unreachableSources?.map(s => s.name).join(', ')}`);
      }
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        console.log('[ResearchAgent] No web search results found, trying Tavily-only fallback');
        
        // Fallback to Tavily-only if hybrid fails
        const tavilyResult = await researchApi.tavilySearch(query, {
          searchDepth: 'advanced',
          topic,
          maxResults: 15,
          includeAnswer: true,
        });
        
        if (tavilyResult.success && tavilyResult.data && tavilyResult.data.length > 0) {
          console.log('[ResearchAgent] Tavily fallback returned', tavilyResult.data.length, 'results');
          
          return tavilyResult.data.map((item, index) => ({
            id: `tavily-${Date.now()}-${index}`,
            title: item.title || `Search Result ${index + 1}`,
            url: item.url,
            content: item.markdown || item.description || '',
            summary: item.description || '',
            relevanceScore: item.score || (0.9 - (index * 0.05)),
            extractedAt: new Date(),
            metadata: {
              domain: new URL(item.url).hostname.replace('www.', ''),
              wordCount: (item.markdown || item.description || '').split(/\s+/).length,
              publishDate: item.publishedDate,
            }
          }));
        }
        
        return [];
      }

      console.log('[ResearchAgent] Hybrid search returned', searchResult.data.length, 'results via', searchResult.searchMethod);
      if (searchResult.summary) {
        console.log('[ResearchAgent] Sources:', searchResult.summary.sourcesReachable, 'reachable,', searchResult.summary.sourcesUnreachable, 'unreachable');
      }

      return searchResult.data.map((item, index) => ({
        id: `hybrid-search-${Date.now()}-${index}`,
        title: item.title || `Search Result ${index + 1}`,
        url: item.url,
        content: item.markdown || item.description || '',
        summary: item.description || '',
        relevanceScore: 0.85 - (index * 0.05),
        extractedAt: new Date(),
        metadata: {
          domain: new URL(item.url).hostname.replace('www.', ''),
          wordCount: (item.markdown || item.description || '').split(/\s+/).length,
          fetchedAt: item.fetchedAt
        }
      }));
    } catch (error) {
      console.error('[ResearchAgent] Web search error:', error);
      throw error; // Re-throw to show the user what went wrong
    }
  }

  // Detect appropriate Tavily topic based on query content
  private detectTavilyTopic(query: string): 'general' | 'news' | 'finance' {
    const q = query.toLowerCase();
    
    // Finance indicators
    if (/\b(stock|ipo|market|trading|invest|fund|equity|bond|dividend|earnings|portfolio|nasdaq|nyse|tasi|tadawul|nomu)\b/.test(q)) {
      return 'finance';
    }
    
    // News indicators
    if (/\b(latest|recent|breaking|today|yesterday|announcement|update|launch|release)\b/.test(q)) {
      return 'news';
    }
    
    return 'general';
  }

  // Helper method for extracting topics (used in fallback scenarios)
  private extractKeyTopics(query: string): string[] {
    const topics: string[] = [];
    const q = query.toLowerCase();
    
    if (/\b(ipo|stock|market|trading|invest|fund|equity)\b/.test(q)) topics.push('Financial Markets');
    if (/\b(saudi|tasi|tadawul|nomu|ksa)\b/.test(q)) topics.push('Saudi Arabia');
    if (/\b(tech|software|ai|startup)\b/.test(q)) topics.push('Technology');
    if (/\b(regul|compliance|governance|law)\b/.test(q)) topics.push('Regulatory');
    if (/\b(trend|analysis|forecast|predict)\b/.test(q)) topics.push('Analysis');
    if (/\b(company|corporate|business)\b/.test(q)) topics.push('Corporate');
    
    return topics.length > 0 ? topics : ['General Research'];
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private normalizeCountryToCode(country?: string): 'sa' | undefined {
    if (!country) return undefined;
    const c = country.toLowerCase().trim();
    if (c === 'sa' || c === 'saudi-arabia' || c.includes('saudi')) return 'sa';
    return undefined;
  }

  private isSaudiQuery(query: string, countryCode?: string): boolean {
    return countryCode === 'sa' || /\b(saudi|tadawul|tasi|nomu|cma|riyadh)\b/i.test(query);
  }

  private calculateVerificationQuality(): Partial<QualityScore> {
    if (this.verifications.length === 0) {
      return { claimVerification: 0.5 };
    }

    const verified = this.verifications.filter(v => v.status === 'verified').length;
    const partiallyVerified = this.verifications.filter(v => v.status === 'partially_verified').length;
    const contradicted = this.verifications.filter(v => v.status === 'contradicted').length;

    const score = (verified * 1 + partiallyVerified * 0.5 - contradicted * 0.3) / this.verifications.length;

    return {
      claimVerification: Math.max(0, Math.min(1, score))
    };
  }

  // AI-only research synthesis - Full agent reasoning without external data sources
  private async generateAIOnlyReport(query: string): Promise<string> {
    console.log('[ResearchAgent] Running full AI-powered research synthesis for:', query);
    this.callbacks.onDecision?.('Running AI-powered research synthesis', 0.85);

    // Phase 1: Query decomposition and planning (using AI)
    const plan = this.currentPlan;
    const queryAnalysis = {
      originalQuery: query,
      intent: plan?.strategy.approach || 'exploratory',
      verificationLevel: plan?.strategy.verificationLevel || 'standard',
    };

    try {
      // AI Knowledge Synthesis - comprehensive research using built-in engine
      this.callbacks.onProgress?.(70);
      this.callbacks.onDecision?.('Generating comprehensive research report', 0.9);

      const reportFormatInstructions = this.getReportFormatInstructions();

      // Get current date context
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });

      // Extract topics for better context
      const topics = this.extractKeyTopics(query);

      const comprehensivePrompt = `You are the Manus 1.6 MAX Research Engine - an expert AI research analyst with comprehensive knowledge of global markets, companies, regulations, and current events.

RESEARCH QUERY: "${query}"

CURRENT DATE: ${currentMonth} ${currentDate.getDate()}, ${currentYear}

IDENTIFIED TOPICS: ${topics.join(', ')}

YOUR TASK: Generate a comprehensive, data-rich research report that DIRECTLY ANSWERS this query using your built-in knowledge base.

${reportFormatInstructions}

MANDATORY REQUIREMENTS:

1. USE YOUR KNOWLEDGE BASE:
   - Provide specific company names, dates, and figures from your training data
   - Reference real market data, trends, and historical events
   - Include actual regulatory information and compliance details
   - Draw on your knowledge of real companies and markets

2. FOR FINANCIAL/MARKET QUERIES:
   - Name REAL companies (e.g., Saudi Aramco, ACWA Power, Alinma Bank, stc, Elm, Dr. Sulaiman Al Habib)
   - Cite REAL stock exchanges (TASI, NOMU, Tadawul, NYSE, etc.)
   - Reference REAL regulators (CMA, SEC, etc.)
   - Include approximate data from your knowledge where available

3. INCLUDE SPECIFIC DATA:
   - Provide tables with company names, dates, and metrics
   - Include percentage changes and trends
   - Reference market indices and performance

4. STRUCTURE:
   - Use markdown tables for structured data
   - Include clear section headers
   - Provide actionable insights and analysis
   - End with a summary of key findings

5. TRANSPARENCY:
   - Note where data may be from your training cutoff
   - Indicate confidence levels where appropriate
   - Suggest areas where real-time verification would be beneficial

NEVER:
- Use placeholder names like "Company A" or "XYZ Corp"
- Give vague generic responses without specifics
- Leave sections empty

NOW GENERATE YOUR COMPREHENSIVE RESEARCH REPORT:`;

      const analysisResult = await researchApi.analyze(query, comprehensivePrompt, 'report', this.reportFormat);

      if (!analysisResult.success || !analysisResult.result) {
        throw new Error('AI research synthesis failed');
      }

      // Phase 3: Self-critique and quality assessment
      this.callbacks.onProgress?.(85);
      this.callbacks.onDecision?.('Running quality assessment', 0.85);

      const critiquePrompt = `You are a research critic reviewing the following report for accuracy and completeness.

ORIGINAL QUERY: "${query}"

RESEARCH REPORT:
${analysisResult.result}

CRITIQUE TASK:
1. Identify any claims that might be outdated or incorrect
2. Note any gaps in the research
3. Suggest improvements
4. Rate overall quality (1-10)

Provide a brief critique (3-5 bullet points) and then a quality score.`;

      const critiqueResult = await researchApi.analyze(query, critiquePrompt, 'analyze');

      // Phase 4: Generate AI-powered report title
      this.callbacks.onProgress?.(90);
      this.callbacks.onDecision?.('Generating professional report title', 0.88);

      const reportTitle = await this.generateReportTitle(query, analysisResult.result);

      // Phase 5: Generate verification insights
      const verificationInsights = this.generateAIVerificationInsights(query);

      // Phase 6: Compile final report
      this.callbacks.onProgress?.(95);
      
      const reportDate = new Date();
      const formattedDate = reportDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const finalReport = `# ${reportTitle}

> **Research Report** | Generated ${formattedDate}

---

## Executive Overview

This comprehensive research report addresses your query: *"${query}"*

**Research Parameters:**
| Parameter | Value |
|-----------|-------|
| Research Mode | AI-Powered Built-in Engine |
| Query Intent | ${queryAnalysis.intent.charAt(0).toUpperCase() + queryAnalysis.intent.slice(1)} |
| Verification Level | ${queryAnalysis.verificationLevel.charAt(0).toUpperCase() + queryAnalysis.verificationLevel.slice(1)} |
| Engine | Manus 1.6 MAX Research Engine |
| Report Date | ${formattedDate} |

---

${analysisResult.result}

---

## Data Quality Assessment

${verificationInsights}

${critiqueResult.success && critiqueResult.result ? `
### Quality Review

${critiqueResult.result.substring(0, 1000)}
` : ''}

## Further Research Recommendations

To verify and expand on these findings:

- **Primary Sources**: Review official websites, regulatory filings, and press releases
- **News Coverage**: Check major financial news outlets for recent developments
- **Academic Resources**: Consult peer-reviewed papers and industry reports
- **Direct Verification**: Contact relevant organizations for current information

---

<div align="center">

**Generated by NexusAI Research Agent**

*Report ID: ${Date.now().toString(36).toUpperCase()}*

</div>`;

      return finalReport;

    } catch (error) {
      console.error('[ResearchAgent] AI synthesis error:', error);
      
      // Even on error, provide a structured response
      return `# Research Report: ${query}

## Status

The research agent encountered an issue while synthesizing this report. Here's what we can provide:

### Query Analysis

Your query "${query}" was analyzed as a ${this.currentPlan?.strategy.approach || 'general'} research request.

### Recommendations

1. **Try again**: The AI service may have been temporarily unavailable
2. **Simplify the query**: Break down complex questions into smaller parts
3. **Add context**: Provide more specific details about what you're looking for

### Next Steps

The research agent can help you with:
- Factual questions about companies, markets, technology, science, and more
- Comparative analysis between options
- Historical research and timeline analysis
- Exploratory research on broad topics

---

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*`;
    }
  }

  // Get format-specific instructions for the AI
  private getReportFormatInstructions(): string {
    switch (this.reportFormat) {
      case 'executive':
        return `FORMAT: Executive Summary
- Keep the report concise (500-800 words max)
- Lead with key findings and conclusions
- Use bullet points for quick scanning
- Focus on actionable insights
- Include only the most critical data`;

      case 'table':
        return `FORMAT: Data Table
- Structure all information in table format
- Include clear column headers
- Organize data by categories
- Use consistent formatting
- Make data easily scannable`;

      case 'detailed':
      default:
        return `FORMAT: Detailed Report
- Comprehensive coverage (1500+ words)
- Include extensive background and context
- Provide detailed analysis
- Use tables and structured data where appropriate
- Cover all aspects of the query thoroughly`;
    }
  }

  // Generate verification insights based on query type
  private generateAIVerificationInsights(query: string): string {
    const queryLower = query.toLowerCase();
    const insights: string[] = [];

    insights.push('### Confidence Levels\n');
    insights.push('The information provided is based on AI knowledge synthesis. Here are key considerations:\n');

    if (/\b(20\d{2}|current|recent|latest|this year)\b/i.test(query)) {
      insights.push('- ⚠️ **Time-Sensitive Data**: This query involves recent events. Information may have changed since the AI knowledge cutoff. Verify with current sources.');
    }

    if (/\b(stock|market|price|trading|ipo|shares)\b/i.test(queryLower)) {
      insights.push('- ⚠️ **Financial Data**: Stock prices, market data, and financial metrics change constantly. Verify with official exchanges and financial data providers.');
    }

    if (/\b(company|companies|business|startup)\b/i.test(queryLower)) {
      insights.push('- ℹ️ **Company Information**: Business details like leadership, products, and financials may have changed. Check official company sources.');
    }

    if (/\b(law|regulation|legal|compliance|policy)\b/i.test(queryLower)) {
      insights.push('- ⚠️ **Regulatory Information**: Laws and regulations change frequently. Consult official government sources or legal professionals.');
    }

    if (/\b(research|study|paper|scientific)\b/i.test(queryLower)) {
      insights.push('- ℹ️ **Research Data**: New studies may have been published. Check academic databases for the latest findings.');
    }

    if (insights.length === 2) {
      insights.push('- ✅ **General Knowledge**: This query involves established information that is less likely to change rapidly.');
    }

    return insights.join('\n');
  }

  // AI-powered report title generation
  private async generateReportTitle(query: string, reportContent: string): Promise<string> {
    try {
      const titlePrompt = `Generate a professional, concise title for this research report.

ORIGINAL QUERY: "${query}"

REPORT CONTENT PREVIEW:
${reportContent.substring(0, 1500)}

INSTRUCTIONS:
1. Create a clear, professional title (max 80 characters)
2. Capture the main topic and scope
3. Use professional language suitable for business reports
4. Do NOT use quotes or colons at the start
5. Include relevant specifics (country, time period, industry) if present in the query

EXAMPLES:
- "Saudi Arabia TASI & NOMU IPO Market Analysis: December 2025"
- "Global AI Market Trends and Investment Opportunities 2025"
- "US Federal Reserve Interest Rate Policy Impact Assessment"
- "Electric Vehicle Industry Competitive Landscape Report"

Return ONLY the title, nothing else:`;

      const result = await researchApi.analyze(query, titlePrompt, 'summarize');
      
      if (result.success && result.result) {
        // Clean up the title
        let title = result.result.trim();
        // Remove any markdown formatting
        title = title.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        // Remove quotes if wrapped
        title = title.replace(/^["']|["']$/g, '').trim();
        // Limit length
        if (title.length > 100) {
          title = title.substring(0, 97) + '...';
        }
        return title || `Research Report: ${query.substring(0, 50)}`;
      }
    } catch (error) {
      console.error('[ResearchAgent] Title generation error:', error);
    }
    
    // Fallback title
    return `Research Report: ${query.substring(0, 60)}${query.length > 60 ? '...' : ''}`;
  }


  getState(): AgentState {
    return this.stateMachine.getState();
  }

  getContext(): DecisionContext {
    return this.stateMachine.getContext();
  }

  getMetrics(): ExecutionMetrics {
    return this.executor.getMetrics();
  }

  getMemoryStats() {
    return this.memory.getStats();
  }

  isActive(): boolean {
    return this.isRunning;
  }

  stop(): void {
    this.isRunning = false;
    this.stateMachine.reset();
  }
}

// Singleton instance
export const researchAgent = new ResearchAgent();
