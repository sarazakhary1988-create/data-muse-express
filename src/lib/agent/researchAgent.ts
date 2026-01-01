// Research Agent - Main orchestrator that coordinates all agent components

import { AgentStateMachine, agentStateMachine } from './stateMachine';
import { PlanningAgent, planningAgent } from './planningAgent';
import { CriticAgent, criticAgent } from './criticAgent';
import { MemorySystem, memorySystem } from './memorySystem';
import { DecisionEngine, decisionEngine } from './decisionEngine';
import { ParallelExecutor, parallelExecutor } from './parallelExecutor';
import { 
  AgentState, 
  ResearchPlan, 
  QualityScore, 
  AgentError,
  DecisionContext,
  ExecutionMetrics,
  ClaimVerification,
  FieldConfidence,
  ExtractedData
} from './types';
import { researchApi } from '@/lib/api/research';
import { DeepVerifySourceConfig } from '@/store/researchStore';

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
    enabledSources: DeepVerifySourceConfig[] = []
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

    console.log(`[ResearchAgent] ========== STARTING RESEARCH ==========`);
    console.log(`[ResearchAgent] Query: "${query}"`);
    console.log(`[ResearchAgent] Deep Verify: ${deepVerifyEnabled}, Sources: ${enabledSources.length}`);

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

      // Phase 2: Deep Verify (if enabled)
      if (deepVerifyEnabled && enabledSources.length > 0) {
        console.log(`[ResearchAgent] 🔍 Phase 2: DEEP VERIFY`);
        await this.executeDeepVerify(query, enabledSources);
        console.log(`[ResearchAgent] Deep verify complete. Results so far: ${this.results.length}`);
      }

      // Phase 3: Web Search
      console.log(`[ResearchAgent] 🌐 Phase 3: WEB SEARCH`);
      await this.stateMachine.transition('searching');
      this.callbacks.onProgress?.(deepVerifyEnabled ? 30 : 15);
      this.callbacks.onDecision?.('Executing parallel web search', 0.85);

      const searchResults = await this.executeSearch(query, deepVerifyEnabled);
      console.log(`[ResearchAgent] Search complete. Found ${searchResults.length} results`);
      this.stateMachine.updateContext({ results: this.results });

      // Phase 4: Content Scraping
      console.log(`[ResearchAgent] 📄 Phase 4: CONTENT SCRAPING`);
      await this.stateMachine.transition('scraping');
      this.callbacks.onProgress?.(deepVerifyEnabled ? 45 : 30);
      this.callbacks.onDecision?.('Scraping content with parallel execution', 0.88);

      await this.executeScraping(searchResults);
      console.log(`[ResearchAgent] Scraping complete. Total results: ${this.results.length}`);
      this.callbacks.onResultsUpdate?.(this.results);

      // Phase 5: Analysis
      console.log(`[ResearchAgent] 🧠 Phase 5: ANALYSIS`);
      await this.stateMachine.transition('analyzing');
      this.callbacks.onProgress?.(60);
      this.callbacks.onDecision?.('Analyzing content with AI', 0.82);

      // Update quality based on analysis
      const analysisQuality = await this.analyzeResults();
      console.log(`[ResearchAgent] Analysis quality:`, analysisQuality);
      this.stateMachine.updateQuality(analysisQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 6: Verification
      console.log(`[ResearchAgent] ✅ Phase 6: VERIFICATION`);
      await this.stateMachine.transition('verifying');
      this.callbacks.onProgress?.(75);
      this.callbacks.onDecision?.('Verifying claims with cross-references', 0.78);

      this.verifications = await this.executeVerification();
      console.log(`[ResearchAgent] Verification complete. Claims verified: ${this.verifications.length}`);
      this.callbacks.onVerificationUpdate?.(this.verifications);

      // Update quality with verification scores
      const verificationQuality = this.calculateVerificationQuality();
      console.log(`[ResearchAgent] Verification quality:`, verificationQuality);
      this.stateMachine.updateQuality(verificationQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 7: Compile Report
      console.log(`[ResearchAgent] 📝 Phase 7: COMPILING REPORT`);
      await this.stateMachine.transition('compiling');
      this.callbacks.onProgress?.(90);
      this.callbacks.onDecision?.('Compiling comprehensive report', 0.92);

      const report = await this.compileReport(query);
      console.log(`[ResearchAgent] Report compiled. Length: ${report.length} characters`);

      // Decision: Check if quality is sufficient
      const context = this.stateMachine.getContext();
      const decision = this.decisionEngine.decide(context);
      console.log(`[ResearchAgent] Decision engine:`, decision);
      this.callbacks.onDecision?.(decision.reason, decision.confidence);

      if (decision.action.type === 'adapt' && context.quality.overall < 0.6) {
        // Low quality - try to improve
        console.log(`[ResearchAgent] ⚠️ Quality below threshold (${(context.quality.overall * 100).toFixed(1)}%), improving...`);
        this.callbacks.onDecision?.('Quality below threshold, searching for more sources', 0.7);
        await this.improveQuality(query);
      }

      // Complete
      console.log(`[ResearchAgent] 🎉 Phase 8: COMPLETING`);
      await this.stateMachine.transition('completed');
      this.callbacks.onProgress?.(100);

      const finalQuality = this.stateMachine.getContext().quality;
      console.log(`[ResearchAgent] ========== RESEARCH COMPLETE ==========`);
      console.log(`[ResearchAgent] Final quality: ${(finalQuality.overall * 100).toFixed(1)}%`);
      console.log(`[ResearchAgent] Total results: ${this.results.length}`);
      console.log(`[ResearchAgent] Verified claims: ${this.verifications.length}`);
      console.log(`[ResearchAgent] Time elapsed: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
      
      this.memory.recordOutcome(
        query,
        this.currentPlan,
        finalQuality,
        this.results.map(r => ({
          url: r.url,
          domain: r.metadata.domain || 'unknown',
          useful: r.relevanceScore > 0.6
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

  private async executeDeepVerify(query: string, sources: DeepVerifySourceConfig[]): Promise<void> {
    this.callbacks.onDecision?.('Crawling official sources for verification', 0.95);

    for (const source of sources) {
      try {
        this.callbacks.onDeepVerifySourceUpdate?.(source.name, 'mapping');

        const mapResult = await researchApi.map(source.baseUrl, query, 50);
        
        if (!mapResult.success || !mapResult.links || mapResult.links.length === 0) {
          this.callbacks.onDeepVerifySourceUpdate?.(source.name, 'failed', 0);
          continue;
        }

        // Filter relevant URLs using search terms from source config
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const relevantUrls = mapResult.links.filter((url: string) => {
          const urlLower = url.toLowerCase();
          // Check if URL contains query terms or source-specific search terms
          return queryWords.some(word => urlLower.includes(word)) ||
                 source.searchTerms.some(term => urlLower.includes(term.toLowerCase()));
        }).slice(0, 8); // Increased from 4 to 8 pages per source

        if (relevantUrls.length === 0) {
          relevantUrls.push(...mapResult.links.slice(0, 4)); // Increased fallback from 2 to 4
        }

        this.callbacks.onDeepVerifySourceUpdate?.(source.name, 'scraping', relevantUrls.length);

        // Parallel scrape with executor
        const { results } = await this.executor.executeAll(
          relevantUrls,
          async (url: string) => {
            const scrapeResult = await researchApi.scrape(url, ['markdown'], true, 3000);
            if (scrapeResult.success && scrapeResult.data?.markdown) {
              return {
                url,
                markdown: scrapeResult.data.markdown,
                title: scrapeResult.data.metadata?.title || url
              };
            }
            return null;
          },
          { priority: 10, retries: 2, timeout: 10000 }
        );

        results.forEach((result, idx) => {
          if (result) {
            this.results.push({
              id: `official-${Date.now()}-${idx}`,
              title: result.title,
              url: result.url,
              content: result.markdown,
              summary: result.markdown.substring(0, 300) + '...',
              relevanceScore: 0.95,
              extractedAt: new Date(),
              metadata: {
                domain: this.extractDomain(result.url),
                wordCount: result.markdown.split(/\s+/).length
              }
            });
          }
        });

        this.callbacks.onDeepVerifySourceUpdate?.(source.name, 'completed', relevantUrls.length);
      } catch (error) {
        console.error(`Error with source ${source.name}:`, error);
        this.callbacks.onDeepVerifySourceUpdate?.(source.name, 'failed', 0);
      }
    }

    this.callbacks.onResultsUpdate?.(this.results);
  }

  private async executeSearch(query: string, deepVerifyEnabled: boolean): Promise<any[]> {
    const maxRetries = 3;
    let lastError: string = '';
    let usedFallback = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ResearchAgent] Search attempt ${attempt}/${maxRetries}`);
        
        const searchResult = await researchApi.search(query, deepVerifyEnabled ? 15 : 20, false);

        // If external search is unavailable, do NOT use synthetic results as sources.
        // We continue in AI-only mode (or with deep-verify sources if present).
        if (searchResult.fallback) {
          usedFallback = true;
          console.log('[ResearchAgent] External search unavailable - continuing without web results');
          this.callbacks.onDecision?.('External search unavailable - continuing with agent reasoning', 0.7);
          return [];
        }

        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          console.log(`[ResearchAgent] Search successful: ${searchResult.data.length} results${usedFallback ? ' (fallback)' : ''}`);
          return searchResult.data;
        }

        lastError = searchResult.error || 'No results found';
        
        // If rate limited, wait with exponential backoff
        if (searchResult.error?.includes('rate') || searchResult.error?.includes('429')) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[ResearchAgent] Rate limited, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Search failed';
        console.error(`[ResearchAgent] Search attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed - continue with existing results or empty
    if (this.results.length > 0) {
      console.log('[ResearchAgent] Search failed but have existing results, continuing...');
      return [];
    }
    
    // No external tools and no results - enter AI-only mode
    console.log('[ResearchAgent] No external search available, entering AI-only research mode');
    this.callbacks.onDecision?.('Running in AI-only mode - synthesizing from knowledge', 0.6);
    return [];
  }

  private async executeScraping(searchResults: any[]): Promise<void> {
    // Increased scraping limit from 6 to 12 sources
    const urlsToScrape = searchResults.slice(0, 12).map(r => r.url);

    const { results } = await this.executor.executeAll(
      urlsToScrape,
      async (url: string) => {
        const scrapeResult = await researchApi.scrape(url, ['markdown'], true);
        if (scrapeResult.success && scrapeResult.data?.markdown) {
          return {
            url,
            markdown: scrapeResult.data.markdown,
            title: scrapeResult.data.metadata?.title || url
          };
        }
        // Retry with onlyMainContent=false
        const retry = await researchApi.scrape(url, ['markdown'], false);
        return {
          url,
          markdown: retry.data?.markdown || '',
          title: retry.data?.metadata?.title || url
        };
      },
      { priority: 5, retries: 2, timeout: 15000 }
    );

    // Merge with search results
    searchResults.forEach((item, index) => {
      const scraped = results.find(r => r?.url === item.url);
      const content = scraped?.markdown && scraped.markdown.length > 200 
        ? scraped.markdown 
        : item.description || '';

      this.results.push({
        id: `result-${Date.now()}-${index}`,
        title: item.title || 'Untitled',
        url: item.url,
        content,
        summary: content ? content.substring(0, 300) + '...' : 'No summary available',
        relevanceScore: this.calculateRelevance(item, this.currentPlan?.query || ''),
        extractedAt: new Date(),
        metadata: {
          domain: this.extractDomain(item.url),
          wordCount: content ? content.split(/\s+/).length : 0
        }
      });
    });

    // Sort by relevance
    this.results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async analyzeResults(): Promise<Partial<QualityScore>> {
    const avgWordCount = this.results.reduce((sum, r) => sum + (r.metadata.wordCount || 0), 0) / Math.max(this.results.length, 1);
    const uniqueDomains = new Set(this.results.map(r => r.metadata.domain)).size;
    const avgRelevance = this.results.reduce((sum, r) => sum + r.relevanceScore, 0) / Math.max(this.results.length, 1);

    // Calculate quality metrics - adjusted for higher source expectations
    const completeness = Math.min(1, this.results.length / 15);
    const sourceQuality = Math.min(1, uniqueDomains / 8);
    const accuracy = avgRelevance;
    const freshness = 0.8; // Would calculate from dates if available

    return {
      completeness,
      sourceQuality,
      accuracy,
      freshness,
      overall: (completeness + sourceQuality + accuracy + freshness) / 4
    };
  }

  private async executeVerification(): Promise<ClaimVerification[]> {
    // Extract key claims from results
    const claims = this.extractClaims();
    
    // Prepare sources for verification
    const sources = this.results.map(r => ({
      url: r.url,
      content: r.content,
      domain: r.metadata.domain || 'unknown'
    }));

    return this.critic.verifyClaims(claims, sources);
  }

  private extractClaims(): { text: string; sources: string[] }[] {
    // Extract factual claims from content - increased from 5 to 10 sources
    const claims: { text: string; sources: string[] }[] = [];
    
    for (const result of this.results.slice(0, 10)) {
      const sentences = result.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      // Look for factual claims (sentences with numbers, dates, names)
      for (const sentence of sentences.slice(0, 15)) {
        const trimmed = sentence.trim();
        if (
          /\d+/.test(trimmed) || // Contains numbers
          /\b(January|February|March|April|May|June|July|August|September|October|November|December|20\d{2})\b/i.test(trimmed) || // Contains dates (any year 20xx)
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(trimmed) // Contains proper nouns
        ) {
          claims.push({
            text: trimmed.slice(0, 200),
            sources: [result.url]
          });
        }
      }
    }

    return claims.slice(0, 20); // Increased from 10 to 20 claims
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

  private async compileReport(query: string): Promise<string> {
    // Check if we have any real content
    const hasContent = this.results.length > 0 && 
      this.results.some(r => r.content && r.content.length > 100 && !r.content.includes('*Content extraction unavailable'));
    
    // If no external content, use AI-only synthesis
    if (!hasContent) {
      console.log('[ResearchAgent] No external sources - using AI-only synthesis');
      return this.generateAIOnlyReport(query);
    }
    
    // Standard flow with sources
    const combinedContent = this.results
      .slice(0, 15)
      .filter(r => r.content && r.content.length > 50)
      .map((r, i) => `SOURCE ${i + 1}: ${r.url}\nTITLE: ${r.title}\nDOMAIN: ${r.metadata.domain || 'unknown'}\n\nCONTENT:\n${r.content}`)
      .join('\n\n---\n\n');

    // Guard: If no content after filtering, use AI synthesis
    if (!combinedContent || combinedContent.trim().length < 100) {
      console.warn('[ResearchAgent] Filtered content too short, using AI synthesis');
      return this.generateAIOnlyReport(query);
    }

    // Try structured extraction first for better data quality
    let extractedData: ExtractedData | null = null;
    try {
      console.log('[ResearchAgent] Extracting structured data...');
      const extractResult = await researchApi.extract(query, combinedContent, 'all');
      if (extractResult.success && extractResult.data) {
        extractedData = extractResult.data;
        console.log('[ResearchAgent] Extracted:', {
          companies: extractedData.companies?.length || 0,
          dates: extractedData.key_dates?.length || 0,
          facts: extractedData.key_facts?.length || 0
        });
      }
    } catch (error) {
      console.error('Structured extraction failed:', error);
    }

    try {
      // If we have structured data, enrich the report prompt
      let enrichedContent = combinedContent;
      if (extractedData && (extractedData.companies?.length > 0 || extractedData.key_facts?.length > 0)) {
        const structuredSummary = this.formatExtractedData(extractedData);
        enrichedContent = `EXTRACTED STRUCTURED DATA:\n${structuredSummary}\n\n---\n\nSOURCE CONTENT:\n${combinedContent}`;
      }

      const analyzeResult = await researchApi.analyze(query, enrichedContent, 'report');
      
      if (analyzeResult.success && analyzeResult.result) {
        // Append structured data table if available
        let report = analyzeResult.result;
        if (extractedData && extractedData.companies?.length > 0) {
          report += this.appendStructuredTable(extractedData);
        }
        return report;
      }
    } catch (error) {
      console.error('AI report generation failed:', error);
    }

    return this.generateFallbackReport(query, extractedData);
  }

  // AI-only research synthesis when no external tools are available
  private async generateAIOnlyReport(query: string): Promise<string> {
    console.log('[ResearchAgent] Generating AI-only synthesis for:', query);
    this.callbacks.onDecision?.('Synthesizing research from AI knowledge base', 0.75);

    try {
      const result = await researchApi.analyze(
        query,
        `This is an AI-only research request. No external sources were available.
        
Research Query: "${query}"

Please provide a comprehensive research report based on your knowledge. Be clear about:
1. What you know with high confidence
2. What might have changed since your training cutoff
3. Recommendations for verifying the information

Format as a proper research report with sections.`,
        'report'
      );

      if (result.success && result.result) {
        return `# Research Report: ${query}

> ⚠️ **Note**: This report was generated using AI knowledge synthesis. External search and scraping services were not available. Please verify critical information with authoritative sources.

${result.result}

---

## Methodology

This research was conducted using AI-powered analysis without access to real-time web search or scraping capabilities. The findings are based on the AI model's training data and should be independently verified for time-sensitive or critical applications.

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*`;
      }
    } catch (error) {
      console.error('AI-only synthesis failed:', error);
    }

    // Ultimate fallback
    return `# Research Report: ${query}

## Status

The research agent was unable to complete this research request. This may be because:

1. **External tools unavailable**: Web search and scraping services are not configured
2. **AI services temporarily unavailable**: The AI analysis service may be experiencing issues

## Recommendations

- Configure external search capabilities (e.g., Firecrawl) for real-time web research
- Retry the research query later
- Consider breaking down the query into smaller, more specific questions

---

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*`;
  }

  private formatExtractedData(data: ExtractedData): string {
    const parts: string[] = [];
    
    if (data.companies?.length > 0) {
      parts.push('COMPANIES:\n' + data.companies.map(c => 
        `- ${c.name}${c.ticker ? ` (${c.ticker})` : ''}${c.market ? ` on ${c.market}` : ''}${c.action ? `: ${c.action}` : ''}${c.date ? ` (${c.date})` : ''}`
      ).join('\n'));
    }
    
    if (data.key_dates?.length > 0) {
      parts.push('KEY DATES:\n' + data.key_dates.map(d => 
        `- ${d.date}: ${d.event}${d.entity ? ` (${d.entity})` : ''}`
      ).join('\n'));
    }
    
    if (data.key_facts?.length > 0) {
      parts.push('KEY FACTS:\n' + data.key_facts.slice(0, 10).map(f => 
        `- ${f.fact}${f.confidence ? ` [${f.confidence}]` : ''}`
      ).join('\n'));
    }
    
    return parts.join('\n\n');
  }

  private appendStructuredTable(data: ExtractedData): string {
    if (!data.companies || data.companies.length === 0) return '';
    
    let table = '\n\n---\n\n## Extracted Data Table\n\n';
    table += '| Company | Ticker | Market | Action | Date | Value |\n';
    table += '|---------|--------|--------|--------|------|-------|\n';
    
    for (const company of data.companies) {
      table += `| ${company.name || 'N/A'} | ${company.ticker || 'N/A'} | ${company.market || 'N/A'} | ${company.action || 'N/A'} | ${company.date || 'N/A'} | ${company.value || 'N/A'} |\n`;
    }
    
    return table;
  }

  private generateFallbackReport(query: string, extractedData?: ExtractedData | null): string {
    const quality = this.stateMachine.getContext().quality;
    const uniqueDomains = new Set(this.results.map(r => r.metadata.domain)).size;

    let report = `# Research Report: ${query}

## Executive Summary

This research analyzed "${query}" using AI-powered analysis. We examined ${this.results.length} sources from ${uniqueDomains} unique domains.

**Quality Score**: ${(quality.overall * 100).toFixed(0)}%
**Claim Verification**: ${(quality.claimVerification * 100).toFixed(0)}%

---

## Key Findings

${this.results.slice(0, 5).map((r, i) => `### ${i + 1}. ${r.title}

${r.summary}

**Source**: [${r.metadata.domain}](${r.url})  
**Relevance**: ${Math.round(r.relevanceScore * 100)}%
`).join('\n')}

---

## Verified Claims

${this.verifications.slice(0, 5).map(v => `- **${v.status.replace('_', ' ')}** (${(v.confidence * 100).toFixed(0)}%): ${v.claim.slice(0, 100)}...`).join('\n') || 'No claims verified yet.'}

---

## All Sources

${this.results.map((r, i) => `${i + 1}. [${r.title}](${r.url})`).join('\n')}

---

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*
`;

    // Append extracted data if available
    if (extractedData) {
      report += this.appendStructuredTable(extractedData);
    }

    return report;
  }

  private async improveQuality(query: string): Promise<void> {
    // Search for more sources with adapted query
    const recommendations = this.memory.getRecommendations(query);
    
    if (recommendations.sourcesToPrioritize.length > 0) {
      this.callbacks.onDecision?.(`Prioritizing sources: ${recommendations.sourcesToPrioritize.slice(0, 3).join(', ')}`, 0.75);
    }

    // Execute additional search with modified query
    const additionalSearch = await researchApi.search(`${query} verified official`, 5, false);
    
    if (additionalSearch.success && additionalSearch.data) {
      const { results } = await this.executor.executeAll(
        additionalSearch.data.slice(0, 3).map(r => r.url),
        async (url: string) => {
          const scrapeResult = await researchApi.scrape(url, ['markdown'], true);
          return scrapeResult.success ? scrapeResult.data : null;
        },
        { priority: 3 }
      );

      // Add new results
      results.forEach((data, idx) => {
        if (data?.markdown) {
          this.results.push({
            id: `improved-${Date.now()}-${idx}`,
            title: data.metadata?.title || 'Additional Source',
            url: additionalSearch.data![idx].url,
            content: data.markdown,
            summary: data.markdown.substring(0, 300) + '...',
            relevanceScore: 0.7,
            extractedAt: new Date(),
            metadata: {
              domain: this.extractDomain(additionalSearch.data![idx].url),
              wordCount: data.markdown.split(/\s+/).length
            }
          });
        }
      });
    }
  }

  private calculateRelevance(item: any, query: string): number {
    const queryLower = query.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();

    let score = 0.5;
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    for (const word of queryWords) {
      if (title.includes(word)) score += 0.15;
      if (description.includes(word)) score += 0.1;
    }

    if (title.includes(queryLower)) score += 0.2;
    
    return Math.min(1, score);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
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
