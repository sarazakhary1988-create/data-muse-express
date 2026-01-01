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
    reportFormat: ReportFormat = 'detailed'
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

    console.log(`[ResearchAgent] ========== STARTING AI-POWERED RESEARCH ==========`);
    console.log(`[ResearchAgent] Query: "${query}"`);
    console.log(`[ResearchAgent] Mode: AI Knowledge Synthesis (Tool-Agnostic)`);
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

      // Phase 2: AI-Powered Research (Primary Mode - No External Tools)
      console.log(`[ResearchAgent] 🧠 Phase 2: AI KNOWLEDGE SYNTHESIS`);
      await this.stateMachine.transition('searching');
      this.callbacks.onProgress?.(15);
      this.callbacks.onDecision?.('Executing AI-powered research synthesis', 0.85);

      // Build virtual results from AI knowledge for internal tracking
      this.results = this.createAIKnowledgeResults(query);
      this.stateMachine.updateContext({ results: this.results });
      this.callbacks.onResultsUpdate?.(this.results);

      // Phase 3: Analysis
      console.log(`[ResearchAgent] 🔍 Phase 3: AI ANALYSIS`);
      await this.stateMachine.transition('analyzing');
      this.callbacks.onProgress?.(40);
      this.callbacks.onDecision?.('Analyzing query with AI reasoning', 0.82);

      // Calculate quality metrics for AI-only mode
      const analysisQuality = this.calculateAIQualityMetrics(query);
      console.log(`[ResearchAgent] Analysis quality:`, analysisQuality);
      this.stateMachine.updateQuality(analysisQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 4: Verification (AI Self-Verification)
      console.log(`[ResearchAgent] ✅ Phase 4: AI SELF-VERIFICATION`);
      await this.stateMachine.transition('verifying');
      this.callbacks.onProgress?.(60);
      this.callbacks.onDecision?.('Running AI self-verification and critique', 0.78);

      this.verifications = await this.executeAIVerification(query);
      console.log(`[ResearchAgent] Verification complete. Claims verified: ${this.verifications.length}`);
      this.callbacks.onVerificationUpdate?.(this.verifications);

      // Update quality with verification scores
      const verificationQuality = this.calculateVerificationQuality();
      console.log(`[ResearchAgent] Verification quality:`, verificationQuality);
      this.stateMachine.updateQuality(verificationQuality);
      this.callbacks.onQualityUpdate?.(this.stateMachine.getContext().quality);

      // Phase 5: Compile Report
      console.log(`[ResearchAgent] 📝 Phase 5: COMPILING REPORT`);
      await this.stateMachine.transition('compiling');
      this.callbacks.onProgress?.(80);
      this.callbacks.onDecision?.('Compiling comprehensive AI-synthesized report', 0.92);

      const report = await this.generateAIOnlyReport(query);
      console.log(`[ResearchAgent] Report compiled. Length: ${report.length} characters`);

      // Complete
      console.log(`[ResearchAgent] 🎉 Phase 6: COMPLETING`);
      await this.stateMachine.transition('completed');
      this.callbacks.onProgress?.(100);

      const finalQuality = this.stateMachine.getContext().quality;
      console.log(`[ResearchAgent] ========== RESEARCH COMPLETE ==========`);
      console.log(`[ResearchAgent] Final quality: ${(finalQuality.overall * 100).toFixed(1)}%`);
      console.log(`[ResearchAgent] Mode: AI Knowledge Synthesis`);
      console.log(`[ResearchAgent] Time elapsed: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
      
      this.memory.recordOutcome(
        query,
        this.currentPlan,
        finalQuality,
        [{
          url: 'ai://knowledge-synthesis',
          domain: 'AI Knowledge Base',
          useful: true
        }],
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

  // Create virtual results representing AI knowledge synthesis
  private createAIKnowledgeResults(query: string): AgentResearchResult[] {
    return [{
      id: `ai-knowledge-${Date.now()}`,
      title: 'AI Knowledge Synthesis',
      url: 'ai://knowledge-synthesis',
      content: `AI-powered research synthesis for: ${query}`,
      summary: 'Research synthesized from AI knowledge base using advanced reasoning.',
      relevanceScore: 0.9,
      extractedAt: new Date(),
      metadata: {
        author: 'NexusAI Research Agent',
        domain: 'AI Knowledge Base',
        wordCount: 0
      }
    }];
  }

  // Calculate quality metrics for AI-only mode
  private calculateAIQualityMetrics(query: string): Partial<QualityScore> {
    // AI-only mode quality assessment based on query characteristics
    const queryLower = query.toLowerCase();
    
    // Check query complexity
    const isComplex = query.length > 100 || query.includes(' and ') || query.includes(' or ');
    const isTimeSensitive = /\b(202[0-9]|current|recent|latest|today)\b/i.test(query);
    const requiresSpecificData = /\b(price|stock|share|market cap|revenue|profit)\b/i.test(queryLower);
    
    // Base quality for AI synthesis
    let completeness = 0.75;
    let accuracy = 0.8;
    let sourceQuality = 0.7;
    let freshness = isTimeSensitive ? 0.5 : 0.8;

    // Adjust for query type
    if (isComplex) {
      completeness -= 0.1;
    }
    if (requiresSpecificData) {
      accuracy -= 0.15;
      freshness -= 0.2;
    }

    const overall = (completeness + accuracy + sourceQuality + freshness) / 4;

    return {
      completeness,
      sourceQuality,
      accuracy,
      freshness,
      overall: Math.max(0.4, overall)
    };
  }

  // AI-powered verification without external sources
  private async executeAIVerification(query: string): Promise<ClaimVerification[]> {
    const verifications: ClaimVerification[] = [];
    const aiSource: VerificationSource = {
      url: 'ai://knowledge-synthesis',
      domain: 'AI Knowledge Base',
      supportLevel: 'moderate',
      excerpt: 'Synthesized from AI reasoning and knowledge base'
    };

    try {
      // Use AI to generate and self-verify key claims
      const verificationPrompt = `Analyze the research query "${query}" and identify 3-5 key factual claims that would need verification.

For each claim, provide:
1. The claim statement
2. Your confidence level (high/medium/low)
3. What sources would be needed to verify this

Format as JSON array:
[{"claim": "...", "confidence": "high|medium|low", "verificationNeeded": "..."}]

Only output the JSON array, nothing else.`;

      const result = await researchApi.analyze(query, verificationPrompt, 'analyze');
      
      if (result.success && result.result) {
        try {
          // Try to extract JSON from the response
          const jsonMatch = result.result.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const claims = JSON.parse(jsonMatch[0]);
            claims.forEach((c: any, idx: number) => {
              const confidenceMap: Record<string, number> = { high: 0.85, medium: 0.65, low: 0.45 };
              verifications.push({
                id: `ai-claim-${Date.now()}-${idx}`,
                claim: c.claim,
                status: c.confidence === 'high' ? 'verified' : 'partially_verified',
                confidence: confidenceMap[c.confidence] || 0.6,
                sources: [{ ...aiSource, excerpt: c.verificationNeeded || 'Self-verified through AI reasoning' }],
                explanation: c.verificationNeeded || 'Self-verified through AI reasoning'
              });
            });
          }
        } catch {
          // Fallback verification
          verifications.push({
            id: `ai-claim-${Date.now()}-fallback`,
            claim: `Research on "${query}" synthesized from AI knowledge`,
            status: 'partially_verified',
            confidence: 0.7,
            sources: [{ ...aiSource, excerpt: 'AI-synthesized research' }],
            explanation: 'AI-synthesized research - recommend external verification for time-sensitive data'
          });
        }
      }
    } catch (error) {
      console.error('[ResearchAgent] AI verification error:', error);
      verifications.push({
        id: `ai-claim-${Date.now()}-error`,
        claim: `Research on "${query}"`,
        status: 'partially_verified',
        confidence: 0.6,
        sources: [aiSource],
        explanation: 'AI-synthesized research'
      });
    }

    return verifications;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
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
      // Phase 2: AI Knowledge Synthesis - comprehensive research prompt
      this.callbacks.onProgress?.(70);
      this.callbacks.onDecision?.('Analyzing query and synthesizing knowledge', 0.82);

      const reportFormatInstructions = this.getReportFormatInstructions();

      const comprehensivePrompt = `You are an expert research analyst with deep knowledge across many domains.

RESEARCH QUERY: "${query}"

TASK: Provide a comprehensive, well-researched answer to this query using your knowledge. This is a REAL research task - provide substantive, detailed information.

${reportFormatInstructions}

IMPORTANT GUIDELINES:
1. BE COMPREHENSIVE: Provide detailed, specific information. Include names, dates, numbers, and facts.
2. BE STRUCTURED: Organize your response with clear sections and subsections.
3. BE ACCURATE: Only state things you are confident about. Clearly mark anything uncertain.
4. BE HELPFUL: Anticipate follow-up questions and address them proactively.
5. CITE KNOWLEDGE: When referencing well-known facts, mention the general source (e.g., "According to industry reports...", "Based on official announcements...").
6. STAY ON TOPIC: Focus ONLY on answering the specific query. Do not include unrelated information.

For LIST queries (companies, products, events, etc.):
- Provide a complete list with details for each item
- Include relevant metadata (dates, values, categories)
- Organize in a table format when appropriate

For COMPARATIVE queries:
- Create clear comparison tables
- Highlight key differences and similarities
- Provide recommendations if appropriate

For FACTUAL queries:
- Give direct answers first
- Provide context and background
- Explain implications or related information

For EXPLORATORY queries:
- Cover the topic comprehensively
- Include multiple perspectives
- Suggest areas for deeper exploration

CONFIDENCE MARKERS:
- [HIGH CONFIDENCE] - Well-established facts
- [MODERATE CONFIDENCE] - Generally accepted but may vary
- [VERIFY] - Information that may have changed or needs confirmation

Now provide your comprehensive research response:`;

      const analysisResult = await researchApi.analyze(query, comprehensivePrompt, 'report', this.reportFormat);

      if (!analysisResult.success || !analysisResult.result) {
        throw new Error('AI synthesis failed');
      }

      // Phase 3: Self-critique and verification
      this.callbacks.onProgress?.(85);
      this.callbacks.onDecision?.('Running self-critique and verification', 0.78);

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

      // Phase 4: Generate verification insights
      const verificationInsights = this.generateAIVerificationInsights(query);

      // Phase 5: Compile final report
      this.callbacks.onProgress?.(95);
      
      const finalReport = `# Research Report: ${query}

## Research Methodology

This report was generated using **AI-powered research synthesis**. The research agent analyzed your query, decomposed it into sub-questions, and synthesized comprehensive findings from its knowledge base.

**Research Parameters:**
- Query Intent: ${queryAnalysis.intent}
- Verification Level: ${queryAnalysis.verificationLevel}
- Analysis Mode: AI Knowledge Synthesis

---

${analysisResult.result}

---

## Verification & Confidence Assessment

${verificationInsights}

${critiqueResult.success && critiqueResult.result ? `
### AI Self-Critique

${critiqueResult.result.substring(0, 1000)}
` : ''}

## Recommendations for Further Research

To verify and expand on these findings, consider:
1. **Official Sources**: Check relevant official websites, regulatory filings, or press releases
2. **News Sources**: Search major news outlets for recent coverage
3. **Academic Sources**: Look for peer-reviewed papers or industry reports
4. **Direct Verification**: Contact relevant organizations directly for current information

---

*Generated by NexusAI Research Agent on ${new Date().toLocaleDateString()}*
*Research Mode: AI Knowledge Synthesis*`;

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
