/**
 * MANUS 1.6 MAX - Core Module Exports
 * 
 * This module provides the foundational components of the Manus 1.6 Max architecture:
 * - Agent Loop: 4-phase orchestration (Analyze → Plan → Execute → Observe)
 * - Real-Time News: Autonomous news fetching using 6 tools (100% REAL-TIME DATA)
 * - Memory & RAG: Hybrid memory with semantic search
 * - Wide Research: 6 specialist agents with consensus building
 * - LLM Router: Multi-model orchestration with 15+ models
 * - Manus Full System: Complete integrated system
 * - Configuration: All models, tools, and real-time data settings
 */

// Configuration - Models, Tools, Real-Time Data Settings
export {
  MANUS_MODELS,
  MANUS_TOOLS,
  DATA_FETCH_CONFIG,
  MODEL_SELECTION_STRATEGY,
  TOOL_SELECTION_STRATEGY,
  getAllModels,
  getAllTools,
  getModelsByCapability,
  getToolsByCapability,
  isRealTimeDataOnly,
  validateConfiguration,
} from './config';

// Agent Loop - 4-Phase Orchestration
export {
  executeAgentLoop,
  analyzePhase,
  planPhase,
  executePhase,
  observePhase,
  type AgentContext,
  type AgentStep,
} from './agentLoop';

// Real-Time News Engine - 6 Tools, 100% Real-Time Data
export {
  getRealtimeNews,
  subscribeToNews,
  getTrendingNews,
  discoverNewsSourcesViaGPT,
  fetchViaBrowserUse,
  fetchViaPlaywright,
  fetchViaCrawl4AI,
  fetchViaCodeAct,
  fetchViaOpenAIWebResearcher,
  type NewsSource,
  type FetchedArticle,
} from './realTimeNews';

// Memory & RAG System
export {
  MemoryManager,
  RAGSystem,
  AgentMemoryStore,
  type MemoryItem,
} from './memory';

// Wide Research
export {
  ResearchAgent,
  WideResearchOrchestrator,
  type ResearchFinding,
  type ConsensusResult,
} from './wideResearchCore';

// LLM Router - 15+ Models
export {
  LLMRouter,
  type LLMModel,
} from './llmRouter';

// Full System Integration
export {
  ManusFullSystem,
  createManusInstance,
  type ManusConfig,
} from './manusFullSystem';

// Perplexity-Style Research (Open Source)
export {
  perplexityResearch,
  evaluateResearch,
  formatResearchResult,
  quickResearch,
  type ResearchQuery,
  type ResearchSource,
  type ResearchResult,
  type Citation,
  type EvaluationMetrics,
} from './perplexityResearch';

// Playwright Research Engine
export {
  initPlaywrightBrowser,
  playwrightSearch,
  playwrightScrape,
  playwrightExtract,
  playwrightExecuteJS,
  playwrightScreenshot,
  playwrightPDF,
  playwrightMonitorNetwork,
  playwrightBatchScrape,
  playwrightSmartScrape,
  playwrightScrapeWithRules,
  NEWS_ARTICLE_RULES,
  COMPANY_PAGE_RULES,
  type PlaywrightConfig,
  type ScrapedData,
  type PlaywrightSearchResult,
  type ScrapingRule,
} from './playwrightEngine';

// Advanced Crawlers - Specialized Engines
export {
  crawlFinancialData,
  crawlRealtimeNews,
  crawlLinkedInProfile,
  scraperAI,
  distributedCrawl,
  advancedCrawlers,
  type FinancialDataConfig,
  type FinancialData,
  type NewsConfig,
  type NewsArticle,
  type LinkedInProfile,
  type ScraperAIConfig,
  type ScraperAIResult,
  type DistributedCrawlConfig,
  type CrawlResult,
} from './advancedCrawlers';

// GCC Financial News Engine - Specialized GCC Market News
export {
  fetchGCCFinancialNews,
  startGCCNewsMonitor,
  GCC_NEWS_SOURCES,
  type GCCNewsArticle,
  type GCCNewsCategory,
  type GCCRegion,
  type GCCNewsSource,
  type FetchGCCNewsOptions,
} from './gccFinancialNews';

