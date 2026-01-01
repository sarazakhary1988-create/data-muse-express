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
  FieldConfidence
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

    try {
      // Phase 1: Planning
      await this.stateMachine.transition('planning');
      this.callbacks.onProgress?.(5);
      this.callbacks.onDecision?.('Creating adaptive research plan', 0.9);

      this.currentPlan = await this.planner.createPlan(query, deepVerifyEnabled);
      this.callbacks.onPlanUpdate?.(this.currentPlan);
      this.stateMachine.updateContext({ plan: this.currentPlan });

      // Phase 2: Deep Verify (if enabled)
      if (deepVerifyEnabled && enabledSources.length > 0) {
        await this.executeDeepVerify(query, enabledSources);
      }

      // Phase 3: Web Search
      await this.stateMachine.transition('searching');
      this.callbacks.onProgress?.(deepVerifyEnabled ? 30 : 15);
      this.callbacks.onDecision?.('Executing parallel web search', 0.85);

      const searchResults = await this.executeSearch(query, deepVerifyEnabled);
      this.stateMachine.updateContext({ results: this.results });

      // Phase 4: Content Scraping
      await this.stateMachine.transition('scraping');
      this.callbacks.onProgress?.(deepVerifyEnabled ? 45 : 30);
      this.callbacks.onDecision?.('Scraping content with parallel execution', 0.88);

      await this.executeScraping(searchResults);
      this.callbacks.onResultsUpdate?.(this.results);

      // Phase 5: Analysis
      await this.stateMachine.transition('analyzing');
      this.callbacks.onProgress?.(60);
      this.callbacks.onDecision?.('Analyzing content with AI', 0.82);

      // Update quality based on analysis
      const analysisQuality = await this.analyzeResults();
      this.stateMachine.updateQuality(analysisQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 6: Verification
      await this.stateMachine.transition('verifying');
      this.callbacks.onProgress?.(75);
      this.callbacks.onDecision?.('Verifying claims with cross-references', 0.78);

      this.verifications = await this.executeVerification();
      this.callbacks.onVerificationUpdate?.(this.verifications);

      // Update quality with verification scores
      const verificationQuality = this.calculateVerificationQuality();
      this.stateMachine.updateQuality(verificationQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 7: Compile Report
      await this.stateMachine.transition('compiling');
      this.callbacks.onProgress?.(90);
      this.callbacks.onDecision?.('Compiling comprehensive report', 0.92);

      const report = await this.compileReport(query);

      // Decision: Check if quality is sufficient
      const context = this.stateMachine.getContext();
      const decision = this.decisionEngine.decide(context);
      this.callbacks.onDecision?.(decision.reason, decision.confidence);

      if (decision.action.type === 'adapt' && context.quality.overall < 0.6) {
        // Low quality - try to improve
        this.callbacks.onDecision?.('Quality below threshold, searching for more sources', 0.7);
        await this.improveQuality(query);
      }

      // Complete
      await this.stateMachine.transition('completed');
      this.callbacks.onProgress?.(100);

      // Record outcome in memory
      const finalQuality = this.stateMachine.getContext().quality;
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

        // Filter relevant URLs
        const relevantUrls = mapResult.links.filter((url: string) => {
          const urlLower = url.toLowerCase();
          return source.searchTerms.some(term => urlLower.includes(term.toLowerCase())) ||
                 urlLower.includes('ipo') || urlLower.includes('listing') ||
                 urlLower.includes('2025') || urlLower.includes('2024');
        }).slice(0, 4);

        if (relevantUrls.length === 0) {
          relevantUrls.push(...mapResult.links.slice(0, 2));
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
    const searchResult = await researchApi.search(query, deepVerifyEnabled ? 8 : 12, false);
    
    if (!searchResult.success || !searchResult.data) {
      if (this.results.length > 0) {
        // Have deep verify results, continue
        return [];
      }
      throw new Error(searchResult.error || 'Search failed');
    }

    return searchResult.data || [];
  }

  private async executeScraping(searchResults: any[]): Promise<void> {
    const urlsToScrape = searchResults.slice(0, 6).map(r => r.url);

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

    // Calculate quality metrics
    const completeness = Math.min(1, this.results.length / 10);
    const sourceQuality = Math.min(1, uniqueDomains / 5);
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
    // Extract factual claims from content
    const claims: { text: string; sources: string[] }[] = [];
    
    for (const result of this.results.slice(0, 5)) {
      const sentences = result.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      // Look for factual claims (sentences with numbers, dates, names)
      for (const sentence of sentences.slice(0, 10)) {
        const trimmed = sentence.trim();
        if (
          /\d+/.test(trimmed) || // Contains numbers
          /\b(January|February|March|April|May|June|July|August|September|October|November|December|2024|2025)\b/i.test(trimmed) || // Contains dates
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(trimmed) // Contains proper nouns
        ) {
          claims.push({
            text: trimmed.slice(0, 200),
            sources: [result.url]
          });
        }
      }
    }

    return claims.slice(0, 10); // Limit to 10 claims
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
    const combinedContent = this.results
      .slice(0, 8)
      .map((r, i) => `SOURCE ${i + 1}: ${r.url}\nTITLE: ${r.title}\nDOMAIN: ${r.metadata.domain || 'unknown'}\n\nCONTENT:\n${r.content}`)
      .join('\n\n---\n\n');

    try {
      const analyzeResult = await researchApi.analyze(query, combinedContent, 'report');
      
      if (analyzeResult.success && analyzeResult.result) {
        return analyzeResult.result;
      }
    } catch (error) {
      console.error('AI report generation failed:', error);
    }

    return this.generateFallbackReport(query);
  }

  private generateFallbackReport(query: string): string {
    const quality = this.stateMachine.getContext().quality;
    const uniqueDomains = new Set(this.results.map(r => r.metadata.domain)).size;

    return `# Research Report: ${query}

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

${this.verifications.slice(0, 5).map(v => `- **${v.status.replace('_', ' ')}** (${(v.confidence * 100).toFixed(0)}%): ${v.claim.slice(0, 100)}...`).join('\n')}

---

## All Sources

${this.results.map((r, i) => `${i + 1}. [${r.title}](${r.url})`).join('\n')}

---

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*
`;
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
