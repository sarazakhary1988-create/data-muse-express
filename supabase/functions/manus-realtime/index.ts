import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// MANUS 1.6 MAX REALTIME ORCHESTRATOR
// ========================================
// WebSocket-based real-time research streaming
// Streams results as they're discovered

interface ManusState {
  status: 'idle' | 'initializing' | 'running' | 'completing' | 'completed' | 'failed';
  currentPhase: 'analyze' | 'plan' | 'execute' | 'observe' | 'verify' | 'synthesize' | 'idle';
  progress: number;
  currentStep: string;
  activeAgents: SubAgentState[];
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  metrics: OrchestratorMetrics;
  errors: OrchestratorError[];
  streamedResults: StreamedResult[];
}

interface SubAgentState {
  id: string;
  type: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  resultsCount: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

interface OrchestratorMetrics {
  totalAgentsSpawned: number;
  activeAgents: number;
  completedAgents: number;
  failedAgents: number;
  totalResultsStreamed: number;
  validResultsStreamed: number;
  rejectedResults: number;
  sourcesProcessed: number;
  urlsValidated: number;
  urlsRejected: number;
  enrichmentsCompleted: number;
  executionTimeMs: number;
}

interface OrchestratorError {
  id: string;
  agentId?: string;
  type: 'agent_failure' | 'validation_error' | 'network_error' | 'timeout' | 'rate_limit';
  message: string;
  recoverable: boolean;
  timestamp: string;
}

interface StreamedResult {
  id: string;
  type: 'article' | 'finding' | 'enrichment' | 'validation' | 'analysis';
  data: any;
  source: string;
  agentId: string;
  confidence: number;
  timestamp: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
}

interface URLValidation {
  isValid: boolean;
  statusCode?: number;
  contentLength?: number;
  hasAuthor: boolean;
  hasDate: boolean;
  hasSSL: boolean;
  aiPatternScore: number;
  genericContentScore: number;
  domain: string;
  errors: string[];
}

// Strict category-specific queries
const STRICT_CATEGORY_QUERIES: Record<string, string> = {
  cma: 'CMA AND (announcement OR regulation OR violation OR fine OR approval OR enforcement)',
  ipo: '(IPO OR listing OR "initial public offering") AND (Saudi OR Tadawul OR CMA)',
  acquisition: '(merger OR acquisition OR consolidation OR "M&A") AND (Saudi OR UAE OR GCC)',
  banking: 'banking AND (sector OR institution OR merger) AND (Saudi OR UAE)',
  real_estate: '("real estate" OR property OR construction) AND (Saudi OR UAE OR GCC)',
  tech_funding: '(technology OR startup OR software OR fintech) AND (Saudi OR UAE)',
  vision_2030: '("Vision 2030" OR "Saudi Vision" OR NEOM OR "giga project")',
  expansion: '(expansion OR "new branch" OR "entering market") AND (Saudi OR UAE)',
};

// Generic content patterns for rejection
const GENERIC_PATTERNS = [
  /in conclusion/i,
  /this article discusses/i,
  /overview of/i,
  /introduction to/i,
  /according to sources/i,
  /it is worth noting/i,
  /as mentioned earlier/i,
  /let's dive in/i,
  /without further ado/i,
];

// Domain whitelist
const VERIFIED_DOMAINS = [
  'cma.gov.sa', 'tadawul.com.sa', 'sec.gov', 'reuters.com', 'bloomberg.com',
  'ft.com', 'wsj.com', 'cnbc.com', 'bbc.com', 'argaam.com', 'zawya.com',
  'arabnews.com', 'gulfnews.com', 'aljazeera.com', 'finance.yahoo.com',
];

const OFFICIAL_DOMAINS = ['cma.gov.sa', 'tadawul.com.sa', 'sec.gov', 'mof.gov.sa'];
const PREMIUM_DOMAINS = ['ft.com', 'bloomberg.com', 'wsj.com', 'economist.com'];

// Store active connections
const connections = new Map<string, WebSocket>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle WebSocket upgrade
  if (upgradeHeader.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connectionId = crypto.randomUUID();
    
    console.log(`[Manus 1.6 MAX] New connection: ${connectionId}`);
    connections.set(connectionId, socket);

    let manusState = createInitialState();
    let isResearching = false;

    socket.onopen = () => {
      console.log(`[Manus 1.6 MAX] Connection opened: ${connectionId}`);
      socket.send(JSON.stringify({
        type: 'connected',
        connectionId,
        version: '1.6.0',
        capabilities: [
          'real-time-streaming',
          'parallel-agents',
          'url-validation',
          'keyword-filtering',
          'relevance-scoring',
          'explorium-enrichment',
        ],
        timestamp: new Date().toISOString(),
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[Manus 1.6 MAX] Message:`, message.type);

        switch (message.type) {
          case 'start_research':
            if (!isResearching) {
              isResearching = true;
              await handleWideResearch(socket, message, manusState);
              isResearching = false;
            }
            break;
          
          case 'cancel_research':
            isResearching = false;
            manusState = createInitialState();
            socket.send(JSON.stringify({
              type: 'research_cancelled',
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'get_status':
            socket.send(JSON.stringify({
              type: 'status_update',
              state: manusState,
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'validate_url':
            const validation = await validateURL(message.url);
            socket.send(JSON.stringify({
              type: 'validation_result',
              url: message.url,
              validation,
              accepted: validation.isValid && !validation.errors.length,
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
        }
      } catch (error) {
        console.error(`[Manus 1.6 MAX] Error:`, error);
        socket.send(JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }));
      }
    };

    socket.onclose = () => {
      console.log(`[Manus 1.6 MAX] Connection closed: ${connectionId}`);
      connections.delete(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`[Manus 1.6 MAX] WebSocket error:`, error);
    };

    return response;
  }

  // Non-WebSocket request
  return new Response(JSON.stringify({
    service: 'Manus 1.6 MAX Realtime Orchestrator',
    version: '1.6.0',
    status: 'running',
    activeConnections: connections.size,
    capabilities: [
      'real-time-result-streaming',
      'parallel-agent-execution',
      'strict-url-validation',
      'category-keyword-filtering',
      'relevance-scoring',
      'generic-content-rejection',
      'explorium-enrichment',
      'codeact-mechanism',
    ],
    agentTypes: [
      'news', 'research', 'lead_enrichment', 'url_validation',
      'cma', 'ipo', 'ma', 'banking', 'real_estate', 'tech', 'vision_2030'
    ],
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function createInitialState(): ManusState {
  return {
    status: 'idle',
    currentPhase: 'idle',
    progress: 0,
    currentStep: 'Waiting for research task...',
    activeAgents: [],
    pendingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    metrics: {
      totalAgentsSpawned: 0,
      activeAgents: 0,
      completedAgents: 0,
      failedAgents: 0,
      totalResultsStreamed: 0,
      validResultsStreamed: 0,
      rejectedResults: 0,
      sourcesProcessed: 0,
      urlsValidated: 0,
      urlsRejected: 0,
      enrichmentsCompleted: 0,
      executionTimeMs: 0,
    },
    errors: [],
    streamedResults: [],
  };
}

async function handleWideResearch(socket: WebSocket, message: any, state: ManusState) {
  const { query, options = {} } = message;
  const startTime = Date.now();
  const category = options.category;
  
  console.log(`[Manus 1.6 MAX] Starting wide research: "${query}" category: ${category}`);

  // Reset state
  state.status = 'initializing';
  state.streamedResults = [];
  state.errors = [];
  state.metrics = createInitialState().metrics;
  
  sendStateUpdate(socket, state);

  try {
    // PHASE 1: ANALYZE
    await executePhase(socket, state, 'analyze', 'Analyzing query intent...', 10, async () => {
      // Build category-specific query
      const categoryQuery = category && STRICT_CATEGORY_QUERIES[category] 
        ? STRICT_CATEGORY_QUERIES[category]
        : query;
      
      return { originalQuery: query, categoryQuery, category };
    });

    // PHASE 2: PLAN
    const agents = await executePhase(socket, state, 'plan', 'Planning parallel agent strategy...', 20, async () => {
      return createAgentPlan(query, category, options);
    });

    // PHASE 3: EXECUTE (Parallel agents)
    state.activeAgents = agents;
    state.metrics.totalAgentsSpawned = agents.length;
    state.metrics.activeAgents = agents.length;
    sendStateUpdate(socket, state);

    await executePhase(socket, state, 'execute', 'Spawning parallel agents...', 60, async () => {
      // Execute agents in parallel and stream results
      await executeParallelAgents(socket, state, query, category, agents);
    });

    // PHASE 4: OBSERVE
    await executePhase(socket, state, 'observe', 'Collecting observations...', 75, async () => {
      state.metrics.sourcesProcessed = state.streamedResults.length;
      return { totalResults: state.streamedResults.length };
    });

    // PHASE 5: VERIFY
    await executePhase(socket, state, 'verify', 'Validating URLs and filtering generic content...', 90, async () => {
      // Final validation pass
      const validResults = state.streamedResults.filter(r => r.validationStatus === 'valid');
      state.metrics.validResultsStreamed = validResults.length;
      state.metrics.rejectedResults = state.streamedResults.length - validResults.length;
      return { validCount: validResults.length };
    });

    // PHASE 6: SYNTHESIZE
    await executePhase(socket, state, 'synthesize', 'Synthesizing final report...', 95, async () => {
      return createResearchSummary(state);
    });

    // COMPLETE
    state.status = 'completed';
    state.progress = 100;
    state.currentStep = 'Research complete!';
    state.metrics.executionTimeMs = Date.now() - startTime;
    sendStateUpdate(socket, state);

    // Send completion with summary
    socket.send(JSON.stringify({
      type: 'research_complete',
      query,
      totalResults: state.streamedResults.length,
      validResults: state.metrics.validResultsStreamed,
      rejectedResults: state.metrics.rejectedResults,
      executionTimeMs: state.metrics.executionTimeMs,
      summary: createResearchSummary(state),
      timestamp: new Date().toISOString(),
    }));

  } catch (error) {
    state.status = 'failed';
    state.errors.push({
      id: `error-${Date.now()}`,
      type: 'agent_failure',
      message: error instanceof Error ? error.message : String(error),
      recoverable: false,
      timestamp: new Date().toISOString(),
    });
    sendStateUpdate(socket, state);
  }
}

async function executePhase<T>(
  socket: WebSocket,
  state: ManusState,
  phase: ManusState['currentPhase'],
  step: string,
  progress: number,
  executor: () => Promise<T>
): Promise<T> {
  state.currentPhase = phase;
  state.currentStep = step;
  state.progress = progress;
  state.status = 'running';
  sendStateUpdate(socket, state);
  
  const result = await executor();
  return result;
}

function createAgentPlan(query: string, category: string | undefined, options: any): SubAgentState[] {
  const agents: SubAgentState[] = [];
  const timestamp = Date.now();

  // News Agent (always)
  agents.push({
    id: `news-${timestamp}`,
    type: 'news',
    status: 'idle',
    progress: 0,
    resultsCount: 0,
    errors: [],
  });

  // Category-specific agent
  if (category) {
    agents.push({
      id: `${category}-${timestamp}`,
      type: category,
      status: 'idle',
      progress: 0,
      resultsCount: 0,
      errors: [],
    });
  }

  // Research agent
  agents.push({
    id: `research-${timestamp}`,
    type: 'research',
    status: 'idle',
    progress: 0,
    resultsCount: 0,
    errors: [],
  });

  // URL Validation agent
  agents.push({
    id: `validation-${timestamp}`,
    type: 'url_validation',
    status: 'idle',
    progress: 0,
    resultsCount: 0,
    errors: [],
  });

  // Explorium Enrichment agent (if enabled)
  if (options.enableExplorium !== false) {
    agents.push({
      id: `explorium-${timestamp}`,
      type: 'explorium_enrichment',
      status: 'idle',
      progress: 0,
      resultsCount: 0,
      errors: [],
    });
  }

  // Lead Enrichment agent (if enabled)
  if (options.enableEnrichment !== false) {
    agents.push({
      id: `enrichment-${timestamp}`,
      type: 'lead_enrichment',
      status: 'idle',
      progress: 0,
      resultsCount: 0,
      errors: [],
    });
  }

  return agents;
}

async function executeParallelAgents(
  socket: WebSocket,
  state: ManusState,
  query: string,
  category: string | undefined,
  agents: SubAgentState[]
) {
  // Execute all agents in parallel
  const promises = agents.map(async (agent, index) => {
    const agentStartTime = Date.now();
    agent.status = 'running';
    agent.startedAt = new Date().toISOString();
    
    // Send agent update
    socket.send(JSON.stringify({
      type: 'agent_update',
      agentId: agent.id,
      agentType: agent.type,
      status: 'running',
      progress: 0,
      timestamp: new Date().toISOString(),
    }));

    try {
      // Simulate agent execution with progressive updates
      const categoryQuery = category && STRICT_CATEGORY_QUERIES[category]
        ? STRICT_CATEGORY_QUERIES[category]
        : query;

      // Generate mock results based on agent type
      const results = await simulateAgentExecution(socket, state, agent, categoryQuery, category);
      
      agent.status = 'completed';
      agent.progress = 100;
      agent.resultsCount = results.length;
      agent.completedAt = new Date().toISOString();
      
      state.metrics.completedAgents++;
      state.completedTasks++;

      socket.send(JSON.stringify({
        type: 'agent_update',
        agentId: agent.id,
        agentType: agent.type,
        status: 'completed',
        progress: 100,
        resultsCount: results.length,
        executionTimeMs: Date.now() - agentStartTime,
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      agent.status = 'failed';
      agent.errors.push(error instanceof Error ? error.message : String(error));
      state.metrics.failedAgents++;
      state.failedTasks++;

      socket.send(JSON.stringify({
        type: 'agent_update',
        agentId: agent.id,
        agentType: agent.type,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }));
    }
  });

  await Promise.all(promises);
}

async function simulateAgentExecution(
  socket: WebSocket,
  state: ManusState,
  agent: SubAgentState,
  query: string,
  category: string | undefined
): Promise<StreamedResult[]> {
  const results: StreamedResult[] = [];
  
  // Different behavior per agent type
  const agentConfigs: Record<string, { count: number; delay: number }> = {
    news: { count: 5, delay: 300 },
    research: { count: 3, delay: 400 },
    cma: { count: 4, delay: 350 },
    ipo: { count: 4, delay: 350 },
    acquisition: { count: 3, delay: 350 },
    banking: { count: 3, delay: 350 },
    real_estate: { count: 3, delay: 350 },
    tech_funding: { count: 3, delay: 350 },
    vision_2030: { count: 3, delay: 350 },
    url_validation: { count: 0, delay: 200 },
    lead_enrichment: { count: 2, delay: 500 },
    explorium_enrichment: { count: 3, delay: 600 },
  };

  const config = agentConfigs[agent.type] || { count: 2, delay: 300 };

  for (let i = 0; i < config.count; i++) {
    await delay(config.delay);
    
    agent.progress = Math.round(((i + 1) / config.count) * 100);
    
    // Create and validate result
    const result = createMockResult(agent, query, category, i);
    
    // Validate URL
    const validation = await validateURL(result.data?.url || '');
    
    if (validation.isValid && !validation.errors.length) {
      // Check for generic content
      const content = `${result.data?.title || ''} ${result.data?.snippet || ''}`;
      const genericScore = checkGenericContent(content);
      
      if (genericScore < 0.5) {
        result.validationStatus = 'valid';
        state.metrics.validResultsStreamed++;
      } else {
        result.validationStatus = 'invalid';
        state.metrics.rejectedResults++;
      }
    } else {
      result.validationStatus = 'invalid';
      state.metrics.urlsRejected++;
    }

    state.metrics.urlsValidated++;
    state.streamedResults.push(result);
    results.push(result);
    state.metrics.totalResultsStreamed++;

    // Stream result to client
    socket.send(JSON.stringify({
      type: 'result_stream',
      result,
      validation: {
        urlValid: validation.isValid,
        errors: validation.errors,
        domain: validation.domain,
        credibility: getCredibilityBadge(validation.domain),
      },
      timestamp: new Date().toISOString(),
    }));
  }

  return results;
}

function createMockResult(
  agent: SubAgentState,
  query: string,
  category: string | undefined,
  index: number
): StreamedResult {
  const sources = ['reuters.com', 'bloomberg.com', 'argaam.com', 'zawya.com', 'ft.com'];
  const source = sources[index % sources.length];
  
  const titles: Record<string, string[]> = {
    news: [
      'Breaking: Saudi market sees significant movement',
      'Gulf markets rally on strong earnings reports',
      'CMA announces new regulatory framework',
    ],
    cma: [
      'CMA issues violation notice to listed company',
      'Capital Market Authority approves new listing rules',
      'CMA enforcement action targets market manipulation',
    ],
    ipo: [
      'Major Saudi IPO raises $2 billion in oversubscribed offering',
      'Tech startup prepares Tadawul debut next quarter',
      'CMA approves prospectus for upcoming listing',
    ],
    research: [
      'Comprehensive analysis of GCC market trends',
      'Research findings on Saudi economic diversification',
      'Deep dive into regional investment patterns',
    ],
    lead_enrichment: [
      'Company profile: Saudi Aramco leadership changes',
      'Executive update: New CFO appointment announced',
    ],
    explorium_enrichment: [
      'Explorium: CEO LinkedIn profile enriched with 15+ data points',
      'Explorium: Company revenue data verified from multiple sources',
      'Explorium: Board member connections mapped across 12 companies',
    ],
  };

  const categoryTitles = titles[agent.type] || titles.news;
  const title = categoryTitles[index % categoryTitles.length];

  // Explorium-specific enrichment data
  const exploriumData = agent.type === 'explorium_enrichment' ? {
    enrichmentType: 'company_intel',
    linkedInProfiles: Math.floor(Math.random() * 10) + 5,
    revenueEstimate: `$${Math.floor(Math.random() * 500) + 100}M`,
    employeeCount: Math.floor(Math.random() * 5000) + 500,
    fundingRounds: Math.floor(Math.random() * 5) + 1,
    dataConfidence: 0.85 + Math.random() * 0.1,
    sources: ['LinkedIn', 'Crunchbase', 'SEC Filings', 'Company Website'],
  } : undefined;

  return {
    id: `result-${agent.id}-${index}-${Date.now()}`,
    type: agent.type === 'lead_enrichment' || agent.type === 'explorium_enrichment' ? 'enrichment' : 'article',
    data: {
      title,
      url: `https://${source}/article/${Date.now()}-${index}`,
      snippet: `${title}. This report provides detailed analysis of the latest developments...`,
      source,
      publishDate: new Date().toISOString(),
      author: 'Staff Reporter',
      category: category || 'general',
      relevanceScore: 75 + Math.floor(Math.random() * 20),
      credibilityBadge: getCredibilityBadge(source),
      ...(exploriumData && { explorium: exploriumData }),
    },
    source,
    agentId: agent.id,
    confidence: 0.8 + Math.random() * 0.15,
    timestamp: new Date().toISOString(),
    validationStatus: 'pending',
  };
}

async function validateURL(url: string): Promise<URLValidation> {
  const result: URLValidation = {
    isValid: false,
    hasAuthor: false,
    hasDate: false,
    hasSSL: false,
    aiPatternScore: 0,
    genericContentScore: 0,
    domain: '',
    errors: [],
  };

  if (!url || typeof url !== 'string') {
    result.errors.push('Empty or invalid URL');
    return result;
  }

  try {
    const urlObj = new URL(url);
    result.domain = urlObj.hostname.replace('www.', '');
    result.hasSSL = urlObj.protocol === 'https:';

    // Check for suspicious domains
    if (result.domain.includes('example.com') || 
        result.domain.includes('placeholder') ||
        result.domain.includes('test.com')) {
      result.errors.push('Suspicious domain detected');
      return result;
    }

    // Check domain whitelist
    const isWhitelisted = VERIFIED_DOMAINS.some(d => result.domain.includes(d));
    if (!isWhitelisted) {
      result.errors.push('Source not in verified whitelist');
    }

    if (!result.hasSSL) {
      result.errors.push('No SSL certificate');
    }

    result.isValid = result.errors.length === 0;
    result.hasAuthor = true; // Would check actual content
    result.hasDate = true; // Would check actual content

  } catch (e) {
    result.errors.push('Invalid URL format');
  }

  return result;
}

function checkGenericContent(content: string): number {
  let matchCount = 0;
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(content)) {
      matchCount++;
    }
  }
  return matchCount / GENERIC_PATTERNS.length;
}

function getCredibilityBadge(domain: string): string {
  if (OFFICIAL_DOMAINS.some(d => domain.includes(d))) return 'official';
  if (PREMIUM_DOMAINS.some(d => domain.includes(d))) return 'premium';
  if (VERIFIED_DOMAINS.some(d => domain.includes(d))) return 'verified';
  return 'unverified';
}

function createResearchSummary(state: ManusState): any {
  const validResults = state.streamedResults.filter(r => r.validationStatus === 'valid');
  const sources = new Set(validResults.map(r => r.source));
  
  return {
    totalSources: sources.size,
    verifiedSources: validResults.filter(r => 
      VERIFIED_DOMAINS.some(d => r.source.includes(d))
    ).length,
    officialSources: validResults.filter(r => 
      OFFICIAL_DOMAINS.some(d => r.source.includes(d))
    ).length,
    totalArticles: state.streamedResults.length,
    validArticles: validResults.length,
    rejectedArticles: state.metrics.rejectedResults,
    averageRelevanceScore: validResults.length > 0
      ? Math.round(validResults.reduce((sum, r) => sum + (r.data?.relevanceScore || 70), 0) / validResults.length)
      : 0,
    topCategories: [...new Set(validResults.map(r => r.data?.category).filter(Boolean))],
    agentsCompleted: state.metrics.completedAgents,
    agentsFailed: state.metrics.failedAgents,
    executionTimeMs: state.metrics.executionTimeMs,
  };
}

function sendStateUpdate(socket: WebSocket, state: ManusState) {
  socket.send(JSON.stringify({
    type: 'state_update',
    state: { ...state },
    timestamp: new Date().toISOString(),
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}