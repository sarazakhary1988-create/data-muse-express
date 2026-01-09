/**
 * Manus 1.6 MAX - Feature Integration Layer
 * 
 * This module integrates all application features with the Manus 1.6 MAX architecture.
 * Each feature is enhanced with the full Manus capabilities:
 * - 4-phase agent loop (Analyze → Plan → Execute → Observe)
 * - Real-time news engine
 * - Memory & RAG system
 * - Wide research with 6 specialist agents
 * - Multi-model LLM orchestration
 */

import { createManusInstance, type ManusConfig } from './manus-core';
import { executeAgentLoop } from './manus-core/agentLoop';
import { getRealtimeNews } from './manus-core/realTimeNews';
import { WideResearchOrchestrator } from './manus-core/wideResearchCore';
import { AgentMemoryStore } from './manus-core/memory';

// Feature types
export type FeatureType = 
  | 'search_engine'
  | 'lead_enrichment'
  | 'company_profile'
  | 'news_ribbon'
  | 'url_scraper'
  | 'template'
  | 'hypothesis';

// Enhanced feature request
export interface FeatureRequest {
  feature: FeatureType;
  query: string;
  context?: Record<string, any>;
  options?: {
    enableAgentLoop?: boolean;
    enableWideResearch?: boolean;
    enableMemory?: boolean;
    enableRealTimeNews?: boolean;
    maxIterations?: number;
  };
}

// Enhanced feature response
export interface FeatureResponse {
  success: boolean;
  data: any;
  manusEnhancements?: {
    agentLoopResult?: any;
    wideResearchResult?: any;
    memoryContext?: string;
    realTimeNews?: any[];
  };
  metrics: {
    executionTimeMs: number;
    agentIterations?: number;
    sourcesUsed?: number;
    confidenceScore?: number;
  };
}

/**
 * Manus-Enhanced Feature Processor
 * Wraps any feature with full Manus 1.6 MAX capabilities
 */
export class ManusFeatureProcessor {
  private manus: ReturnType<typeof createManusInstance>;
  private memory: AgentMemoryStore;
  private wideResearch: WideResearchOrchestrator;

  constructor(sessionId: string = `session_${Date.now()}`) {
    this.manus = createManusInstance({
      models: [
        'claude-3-5-sonnet',
        'claude-3-7-sonnet',
        'gpt-5',
        'gpt-4o',
        'deepseek-v3',
        'gemini-2.0-flash',
        'gemini-2.0-pro',
        'llama-4-scout-17b-16e',
        'qwen-2.5-72b',
        'qwen-2.5-coder-32b'
      ],
      tools: [
        'browser-use',
        'playwright',
        'crawl4ai',
        'codeact',
        'gpt-research',
        'openai-web-researcher'
      ],
      memorySize: 100,
      maxIterations: 5,
      sessionId,
    });
    
    this.memory = new AgentMemoryStore(sessionId);
    this.wideResearch = new WideResearchOrchestrator();
  }

  /**
   * Initialize Manus system
   */
  async initialize(): Promise<void> {
    await this.manus.initialize();
    console.log('🚀 Manus Feature Processor initialized');
  }

  /**
   * Process any feature with Manus enhancements
   */
  async processFeature(request: FeatureRequest): Promise<FeatureResponse> {
    const startTime = Date.now();
    const options = request.options || {};
    
    console.log(`🎯 Processing ${request.feature} with Manus 1.6 MAX`);

    // Store request in memory
    if (options.enableMemory !== false) {
      await this.memory.store(
        JSON.stringify({ feature: request.feature, query: request.query }),
        'experience',
        { feature: request.feature }
      );
    }

    const manusEnhancements: any = {};

    // Run agent loop if enabled
    if (options.enableAgentLoop !== false) {
      console.log('🔄 Running 4-phase agent loop...');
      const agentResult = await executeAgentLoop(
        request.query,
        options.maxIterations || 5
      );
      manusEnhancements.agentLoopResult = agentResult;
    }

    // Run wide research if enabled
    if (options.enableWideResearch) {
      console.log('🔬 Running wide research with 6 specialist agents...');
      const researchResult = await this.wideResearch.research(
        request.query,
        'comprehensive'
      );
      manusEnhancements.wideResearchResult = researchResult;
    }

    // Get memory context if enabled
    if (options.enableMemory !== false) {
      const memoryContext = await this.memory.retrieveContext(request.query);
      manusEnhancements.memoryContext = memoryContext;
    }

    // Fetch real-time news if enabled
    if (options.enableRealTimeNews) {
      console.log('📰 Fetching real-time news...');
      const news = await getRealtimeNews(request.query, 10);
      manusEnhancements.realTimeNews = news;
    }

    // Feature-specific processing
    let featureData: any;
    switch (request.feature) {
      case 'search_engine':
        featureData = await this.processSearchEngine(request);
        break;
      case 'lead_enrichment':
        featureData = await this.processLeadEnrichment(request);
        break;
      case 'company_profile':
        featureData = await this.processCompanyProfile(request);
        break;
      case 'news_ribbon':
        featureData = await this.processNewsRibbon(request);
        break;
      case 'url_scraper':
        featureData = await this.processUrlScraper(request);
        break;
      case 'template':
        featureData = await this.processTemplate(request);
        break;
      case 'hypothesis':
        featureData = await this.processHypothesis(request);
        break;
      default:
        featureData = { error: 'Unknown feature type' };
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: !featureData.error,
      data: featureData,
      manusEnhancements,
      metrics: {
        executionTimeMs,
        agentIterations: manusEnhancements.agentLoopResult?.iterations,
        sourcesUsed: manusEnhancements.wideResearchResult?.findings?.length,
        confidenceScore: manusEnhancements.wideResearchResult?.score,
      },
    };
  }

  /**
   * Search Engine - Enhanced with Manus agent loop
   */
  private async processSearchEngine(request: FeatureRequest): Promise<any> {
    console.log('🔍 Processing search engine query with Manus...');
    
    // Get memory context for better results
    const context = await this.memory.retrieveContext(request.query);
    
    // Use agent loop for complex queries
    const result = await executeAgentLoop(
      `Research: ${request.query}\n\nContext: ${context}`,
      3
    );

    return {
      query: request.query,
      results: result,
      contextUsed: context.length > 0,
    };
  }

  /**
   * Lead Enrichment - Enhanced with wide research
   */
  private async processLeadEnrichment(request: FeatureRequest): Promise<any> {
    console.log('👤 Processing lead enrichment with Manus wide research...');
    
    const { firstName, lastName, company, linkedinUrl } = request.context || {};
    const leadQuery = `Enrich profile: ${firstName} ${lastName} at ${company}`;

    // Use wide research for comprehensive profile
    const research = await this.wideResearch.research(leadQuery, 'comprehensive');

    return {
      profile: {
        name: `${firstName} ${lastName}`,
        company,
        linkedinUrl,
      },
      enrichment: research.findings,
      confidence: research.score,
      consensus: research.consensus,
    };
  }

  /**
   * Company Profile - Enhanced with agent loop and news
   */
  private async processCompanyProfile(request: FeatureRequest): Promise<any> {
    console.log('🏢 Processing company profile with Manus...');
    
    const { companyName } = request.context || {};
    
    // Get company news
    const news = await getRealtimeNews(`${companyName} company news`, 10);
    
    // Deep research on company
    const research = await this.wideResearch.research(
      `Comprehensive company profile for ${companyName}`,
      'comprehensive'
    );

    return {
      company: companyName,
      profile: research.findings,
      recentNews: news,
      confidence: research.score,
    };
  }

  /**
   * News Ribbon - Enhanced with real-time news engine
   */
  private async processNewsRibbon(request: FeatureRequest): Promise<any> {
    console.log('📰 Processing news ribbon with Manus real-time engine...');
    
    const { category, region } = request.context || {};
    const newsQuery = `${category || ''} ${region || ''} news`.trim();
    
    // Get real-time news with all 5 tools
    const news = await getRealtimeNews(newsQuery, 20);

    return {
      category,
      region,
      articles: news,
      fetchedAt: new Date(),
    };
  }

  /**
   * URL Scraper - Enhanced with agent loop for AI commands
   */
  private async processUrlScraper(request: FeatureRequest): Promise<any> {
    console.log('🌐 Processing URL scraper with Manus...');
    
    const { url, aiCommand } = request.context || {};
    
    // Use agent loop to understand and execute AI command
    const result = await executeAgentLoop(
      `Scrape ${url} and ${aiCommand || 'extract all content'}`,
      3
    );

    return {
      url,
      aiCommand,
      extractedData: result,
    };
  }

  /**
   * Template - Enhanced with agent loop
   */
  private async processTemplate(request: FeatureRequest): Promise<any> {
    console.log('📝 Processing template with Manus agent loop...');
    
    const { templateId, templateData } = request.context || {};
    
    // Execute template with agent loop
    const result = await executeAgentLoop(
      `Execute template ${templateId}: ${JSON.stringify(templateData)}`,
      5
    );

    return {
      templateId,
      result,
    };
  }

  /**
   * Hypothesis - Enhanced with wide research for validation
   */
  private async processHypothesis(request: FeatureRequest): Promise<any> {
    console.log('💡 Processing hypothesis with Manus wide research...');
    
    const { hypothesis } = request.context || {};
    
    // Use 6 specialist agents to validate hypothesis
    const validation = await this.wideResearch.research(
      `Validate hypothesis: ${hypothesis}`,
      'comprehensive'
    );

    // Determine if hypothesis is supported
    const supportingFindings = validation.findings.filter(
      f => f.confidence > 0.7
    );
    const refutingFindings = validation.findings.filter(
      f => f.confidence < 0.3
    );

    return {
      hypothesis,
      status: validation.consensus ? 'supported' : 'refuted',
      confidence: validation.score,
      supportingEvidence: supportingFindings,
      refutingEvidence: refutingFindings,
      agentFindings: validation.findings,
    };
  }

  /**
   * Get memory for a feature
   */
  async getFeatureMemory(featureType: FeatureType): Promise<any[]> {
    return await this.memory.recall(featureType);
  }

  /**
   * Clear memory for a feature
   */
  async clearFeatureMemory(featureType: FeatureType): Promise<void> {
    console.log(`🗑️ Clearing memory for ${featureType}`);
    // Note: Memory clearing would need to be implemented in the memory system
  }
}

// Singleton instance
let globalProcessor: ManusFeatureProcessor | null = null;

/**
 * Get or create the global Manus feature processor
 */
export function getManusFeatureProcessor(sessionId?: string): ManusFeatureProcessor {
  if (!globalProcessor || sessionId) {
    globalProcessor = new ManusFeatureProcessor(sessionId);
  }
  return globalProcessor;
}

/**
 * Quick helper to process a feature with Manus enhancements
 */
export async function processWithManus(
  feature: FeatureType,
  query: string,
  context?: Record<string, any>,
  options?: FeatureRequest['options']
): Promise<FeatureResponse> {
  const processor = getManusFeatureProcessor();
  await processor.initialize();
  
  return processor.processFeature({
    feature,
    query,
    context,
    options,
  });
}
