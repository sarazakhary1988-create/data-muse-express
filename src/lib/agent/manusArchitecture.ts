// ========================================
// MANUS 1.6 MAX ARCHITECTURE
// ========================================
// Wide Research Engine with Multi-Agent System
// Foundation Models: DeepSeek-V3, Qwen 2.5, Claude 3.5/3.7
// Core Loop: Analyze → Plan → Execute → Observe → Iterate
// ========================================

// ============ FOUNDATION MODEL CONFIGURATION ============
export const FOUNDATION_MODELS = {
  // Primary reasoning model (DeepSeek-V3 equivalent via ORKESTRA AI)
  PRIMARY_REASONER: 'google/gemini-2.5-pro',
  // Tool use and complex instructions (Qwen 2.5 equivalent)
  TOOL_EXECUTOR: 'google/gemini-2.5-flash',
  // Planning and synthesis (Claude equivalent)
  PLANNER_SYNTHESIZER: 'google/gemini-2.5-flash',
  // Fast classification and simple tasks
  FAST_CLASSIFIER: 'google/gemini-2.5-flash-lite',
} as const;

// ============ AGENT STATES ============
export type ManusAgentState = 
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'observing'
  | 'verifying'
  | 'synthesizing'
  | 'completed'
  | 'failed';

// ============ CORE AGENT LOOP ============
export interface AgentLoopContext {
  state: ManusAgentState;
  query: string;
  iteration: number;
  maxIterations: number;
  observations: AgentObservation[];
  plan: AgentPlan | null;
  results: AgentResult[];
  errors: AgentError[];
  metrics: AgentMetrics;
}

export interface AgentObservation {
  id: string;
  type: 'search_result' | 'scrape_result' | 'api_response' | 'validation_result' | 'enrichment_result';
  data: any;
  timestamp: Date;
  source: string;
  confidence: number;
}

export interface AgentPlan {
  id: string;
  steps: AgentStep[];
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  adaptations: PlanAdaptation[];
}

export interface AgentStep {
  id: string;
  type: 'search' | 'scrape' | 'analyze' | 'verify' | 'enrich' | 'validate' | 'synthesize';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  description: string;
  input: any;
  output?: any;
  duration?: number;
}

export interface PlanAdaptation {
  timestamp: Date;
  reason: string;
  changes: string[];
}

export interface AgentResult {
  id: string;
  type: string;
  data: any;
  confidence: number;
  sources: string[];
  verificationStatus: 'verified' | 'partial' | 'unverified';
}

export interface AgentError {
  id: string;
  type: 'network' | 'validation' | 'timeout' | 'rate_limit' | 'quality';
  message: string;
  recoverable: boolean;
  timestamp: Date;
}

export interface AgentMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  sourcesProcessed: number;
  factsExtracted: number;
  verificationsPerformed: number;
  executionTimeMs: number;
}

// ============ CODEACT MECHANISM ============
// Manus agents generate executable code for sandboxed execution
export interface CodeActExecution {
  id: string;
  code: string;
  language: 'python' | 'javascript';
  sandboxId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  executionTimeMs?: number;
}

// ============ WIDE RESEARCH MODULE ============
export interface WideResearchConfig {
  maxSubAgents: number;
  parallelExecutions: number;
  scrapeDepth: 'shallow' | 'medium' | 'deep';
  verificationLevel: 'basic' | 'standard' | 'thorough';
  minSourcesPerClaim: number;
  timeout: number;
  country?: string;
  category?: string;
}

export interface SubAgent {
  id: string;
  type: 'search' | 'scrape' | 'validate' | 'enrich' | 'classify';
  status: 'idle' | 'running' | 'completed' | 'failed';
  query: string;
  results: any[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

// ============ MCP INTEGRATION ============
// Model Context Protocol for browser-use, crawl4ai, data extraction
export interface MCPConnector {
  id: string;
  name: string;
  type: 'browser_use' | 'crawl4ai' | 'data_extraction' | 'api_connector';
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
}

export const MCP_CONNECTORS: MCPConnector[] = [
  {
    id: 'browser_use',
    name: 'Browser Automation',
    type: 'browser_use',
    status: 'connected',
    capabilities: ['page_navigation', 'form_filling', 'screenshot', 'element_interaction'],
  },
  {
    id: 'crawl4ai',
    name: 'Crawl4AI',
    type: 'crawl4ai',
    status: 'connected',
    capabilities: ['web_scraping', 'content_extraction', 'link_discovery', 'markdown_conversion'],
  },
  {
    id: 'explorium',
    name: 'Explorium Data',
    type: 'data_extraction',
    status: 'connected',
    capabilities: ['company_data', 'linkedin_profiles', 'income_estimates', 'employee_count'],
  },
];

// ============ DATA SOURCE CONNECTORS ============
export interface DataSourceConnector {
  id: string;
  name: string;
  type: 'news' | 'financial' | 'regulatory' | 'social' | 'academic';
  endpoint?: string;
  apiKeyEnv?: string;
  keywords: string[];
  priority: number;
  isOfficial: boolean;
}

export const DATA_SOURCE_CONNECTORS: DataSourceConnector[] = [
  // Official Sources
  { id: 'cma', name: 'CMA Official API', type: 'regulatory', keywords: ['cma', 'announcement', 'regulation', 'violation', 'fine'], priority: 10, isOfficial: true },
  { id: 'argaam', name: 'Argaam Feed', type: 'news', keywords: ['saudi', 'gcc', 'market', 'stock'], priority: 9, isOfficial: true },
  { id: 'tadawul', name: 'Tadawul News', type: 'financial', keywords: ['tadawul', 'tasi', 'nomu', 'listing'], priority: 10, isOfficial: true },
  
  // Premium News
  { id: 'reuters', name: 'Reuters API', type: 'news', keywords: ['breaking', 'world', 'business'], priority: 8, isOfficial: false },
  { id: 'bloomberg', name: 'Bloomberg API', type: 'financial', keywords: ['market', 'finance', 'economy'], priority: 8, isOfficial: false },
  { id: 'ft', name: 'Financial Times API', type: 'news', keywords: ['business', 'economy', 'markets'], priority: 7, isOfficial: false },
  
  // Financial Data
  { id: 'yahoo', name: 'Yahoo Finance API', type: 'financial', keywords: ['stock', 'quote', 'chart'], priority: 6, isOfficial: false },
  { id: 'alpha_vantage', name: 'Alpha Vantage', type: 'financial', keywords: ['stock', 'forex', 'crypto'], priority: 5, isOfficial: false },
  { id: 'polygon', name: 'Polygon.io', type: 'financial', keywords: ['market', 'data', 'realtime'], priority: 5, isOfficial: false },
  { id: 'iex', name: 'IEX Cloud', type: 'financial', keywords: ['stock', 'market', 'data'], priority: 5, isOfficial: false },
  { id: 'twelve_data', name: 'Twelve Data', type: 'financial', keywords: ['forex', 'stock', 'crypto'], priority: 4, isOfficial: false },
  { id: 'finnhub', name: 'Finnhub', type: 'financial', keywords: ['stock', 'forex', 'crypto'], priority: 4, isOfficial: false },
  
  // Regulatory
  { id: 'sec_edgar', name: 'SEC EDGAR', type: 'regulatory', keywords: ['sec', 'filing', '10k', '10q'], priority: 9, isOfficial: true },
  
  // General News
  { id: 'newsapi', name: 'NewsAPI', type: 'news', keywords: ['news', 'headlines', 'articles'], priority: 6, isOfficial: false },
  { id: 'mediastack', name: 'MediaStack API', type: 'news', keywords: ['news', 'live', 'headlines'], priority: 5, isOfficial: false },
  
  // Research
  { id: 'seeking_alpha', name: 'Seeking Alpha', type: 'financial', keywords: ['analysis', 'research', 'stock'], priority: 6, isOfficial: false },
];

// ============ CATEGORY-SPECIFIC KEYWORD MAPS ============
export const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  cma: ['CMA announcement', 'CMA regulation', 'CMA violation', 'CMA fine', 'Capital Market Authority', 'CMA penalty', 'CMA suspension'],
  ipo: ['IPO', 'initial public offering', 'listing', 'prospectus', 'public float', 'stock debut', 'goes public'],
  acquisition: ['merger', 'acquisition', 'M&A', 'buyout', 'takeover', 'deal', 'acquiring'],
  banking: ['banking sector', 'bank profit', 'bank earnings', 'SNB', 'Al Rajhi', 'banking services', 'loan growth'],
  real_estate: ['real estate', 'property development', 'construction', 'housing', 'commercial property', 'ROSHN', 'property market'],
  tech_funding: ['technology', 'startup', 'software', 'fintech', 'venture capital', 'series funding', 'tech investment'],
  vision_2030: ['Vision 2030', 'Saudi Vision 2030', 'NEOM', 'giga project', 'Qiddiya', 'Red Sea', 'Diriyah'],
  expansion: ['expansion', 'opening', 'launch', 'new branch', 'entering market', 'growth plan', 'new facility'],
  contract: ['contract awarded', 'billion deal', 'agreement signed', 'project contract', 'tender won'],
  joint_venture: ['joint venture', 'JV', 'partnership', 'MOU signed', 'strategic alliance'],
  appointment: ['CEO appointed', 'chairman named', 'executive hire', 'board member', 'CFO announcement'],
  regulatory: ['regulation', 'compliance', 'filing', 'SEC', 'CMA', 'regulatory approval'],
  market: ['stock market', 'trading', 'index', 'market cap', 'shares', 'equity market'],
};

// ============ URL VALIDATION & CREDIBILITY ============
export interface URLValidationResult {
  isValid: boolean;
  domain: string;
  credibilityScore: number;
  credibilityBadge: 'official' | 'verified' | 'premium' | 'custom' | 'warning' | 'unknown';
  warnings: string[];
  isWhitelisted: boolean;
  hasSSL: boolean;
  hasPublishDate: boolean;
  hasAuthor: boolean;
  aiPatternScore: number; // 0-1, higher = more likely AI-generated
}

// Domain Whitelist for trusted sources
export const OFFICIAL_DOMAINS = [
  'cma.gov.sa', 'cma.org.sa', 'tadawul.com.sa', 'saudiexchange.sa',
  'sec.gov', 'nasdaq.com', 'nyse.com', 'lseg.com',
];

export const VERIFIED_DOMAINS = [
  'reuters.com', 'bloomberg.com', 'bbc.com', 'aljazeera.com',
  'cnbc.com', 'wsj.com', 'economist.com', 'ft.com',
  'zawya.com', 'argaam.com', 'arabianbusiness.com',
];

export const PREMIUM_DOMAINS = [
  'ft.com', 'bloomberg.com', 'economist.com', 'wsj.com',
];

export const DOMAIN_WHITELIST = [
  ...OFFICIAL_DOMAINS,
  ...VERIFIED_DOMAINS,
  'theconversation.com', 'arabiangazette.com', 'marketscreener.com',
  'arizton.com', 'agbionline.com', 'yahoo.com', 'finance.yahoo.com',
  'seekingalpha.com', 'investing.com', 'marketwatch.com',
];

// AI-generated content patterns
export const AI_GENERATED_PATTERNS = [
  /in conclusion/i,
  /it is worth noting/i,
  /it's important to note/i,
  /as mentioned earlier/i,
  /to summarize/i,
  /in this article, we will/i,
  /let's dive in/i,
  /without further ado/i,
];

// ============ EXPLORIUM ENRICHMENT ============
export interface ExploriumEnrichment {
  companyName: string;
  linkedInProfiles: LinkedInProfile[];
  companySize: string;
  estimatedRevenue: string;
  industry: string;
  headquarters: string;
  employeeCount: number;
  enrichedAt: Date;
}

export interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  estimatedIncome?: string;
  location?: string;
}

// ============ MEMORY MODULE ============
export interface ManusMemory {
  type: 'working' | 'research' | 'verified';
  id: string;
  content: any;
  timestamp: Date;
  relevanceScore: number;
  expiresAt?: Date;
}

// ============ GUARDRAILS ============
export interface Guardrail {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  condition: string;
  action: 'block' | 'warn' | 'modify' | 'log';
}

export const MANUS_GUARDRAILS: Guardrail[] = [
  { id: 'no_future_financial', name: 'No Future Financial Data', type: 'hard', condition: 'future_financial_prediction', action: 'block' },
  { id: 'no_synthetic_metrics', name: 'No Synthetic Metrics', type: 'hard', condition: 'synthetic_data_generation', action: 'block' },
  { id: 'source_required', name: 'Source Required', type: 'hard', condition: 'unverified_claim', action: 'warn' },
  { id: 'domain_whitelist', name: 'Domain Whitelist', type: 'hard', condition: 'untrusted_domain', action: 'block' },
  { id: 'publish_date_required', name: 'Publish Date Required', type: 'soft', condition: 'missing_publish_date', action: 'warn' },
  { id: 'author_required', name: 'Author Required', type: 'soft', condition: 'missing_author', action: 'log' },
];

// ============ REPORT STRUCTURE ============
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
  credibilityBadge: URLValidationResult['credibilityBadge'];
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

// ============ UTILITY FUNCTIONS ============
export function validateURL(url: string): URLValidationResult {
  const result: URLValidationResult = {
    isValid: false,
    domain: '',
    credibilityScore: 0,
    credibilityBadge: 'unknown',
    warnings: [],
    isWhitelisted: false,
    hasSSL: false,
    hasPublishDate: false,
    hasAuthor: false,
    aiPatternScore: 0,
  };

  try {
    const urlObj = new URL(url);
    result.domain = urlObj.hostname.replace('www.', '');
    result.hasSSL = urlObj.protocol === 'https:';
    
    if (!result.hasSSL) {
      result.warnings.push('No SSL certificate');
    }

    // Check whitelist
    result.isWhitelisted = DOMAIN_WHITELIST.some(d => result.domain.includes(d));
    
    // Determine credibility badge
    if (OFFICIAL_DOMAINS.some(d => result.domain.includes(d))) {
      result.credibilityBadge = 'official';
      result.credibilityScore = 1.0;
    } else if (PREMIUM_DOMAINS.some(d => result.domain.includes(d))) {
      result.credibilityBadge = 'premium';
      result.credibilityScore = 0.95;
    } else if (VERIFIED_DOMAINS.some(d => result.domain.includes(d))) {
      result.credibilityBadge = 'verified';
      result.credibilityScore = 0.9;
    } else if (result.isWhitelisted) {
      result.credibilityBadge = 'custom';
      result.credibilityScore = 0.75;
    } else {
      result.credibilityBadge = 'warning';
      result.credibilityScore = 0.3;
      result.warnings.push('Domain not in whitelist');
    }

    result.isValid = result.credibilityScore >= 0.3;
    
  } catch (e) {
    result.warnings.push('Invalid URL format');
  }

  return result;
}

export function checkAIPatterns(content: string): number {
  let score = 0;
  const matches = AI_GENERATED_PATTERNS.filter(pattern => pattern.test(content));
  score = matches.length / AI_GENERATED_PATTERNS.length;
  return Math.min(score, 1);
}

export function buildCategoryQuery(category: string, baseQuery?: string): string {
  const keywords = CATEGORY_KEYWORD_MAP[category] || [];
  if (keywords.length === 0) return baseQuery || '';
  
  const keywordQuery = keywords.slice(0, 4).join(' OR ');
  return baseQuery ? `${baseQuery} (${keywordQuery})` : keywordQuery;
}

export function getConnectorsByCategory(category: string): DataSourceConnector[] {
  return DATA_SOURCE_CONNECTORS.filter(c => 
    c.keywords.some(k => category.toLowerCase().includes(k.toLowerCase()))
  ).sort((a, b) => b.priority - a.priority);
}
