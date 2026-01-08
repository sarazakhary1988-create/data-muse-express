import { useCallback, useRef, useEffect } from 'react';
import { ResearchTask, Report, useResearchStore, ReportFormat, RunHistoryEntry } from '@/store/researchStore';
import { researchAgent, dataConsolidator } from '@/lib/agent';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { withLLMConfig } from '@/lib/llmConfig';

// Query intent detection - mirrors research-command-router logic
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const LINKEDIN_PATTERN = /linkedin\.com\/(in|company)\/[\w-]+/i;
const PROFILE_PATTERNS = [
  /\b(who is|about|profile|biography|background|career)\b/i,
  /\b(CEO|CFO|COO|chairman|director|founder|executive)\s+(of|at)\b/i,
];
const COMPANY_PATTERNS = [
  /\b(company|corporation|inc|ltd|llc|plc|about company|company profile)\b/i,
];

type QueryIntent = 'url_scrape' | 'profile_lookup' | 'company_research' | 'general_research';

function detectQueryIntent(query: string): { intent: QueryIntent; urls: string[] } {
  const urls = query.match(URL_PATTERN) || [];
  
  if (urls.length > 0) {
    return { intent: LINKEDIN_PATTERN.test(query) ? 'profile_lookup' : 'url_scrape', urls };
  }
  if (PROFILE_PATTERNS.some(p => p.test(query))) {
    return { intent: 'profile_lookup', urls: [] };
  }
  if (COMPANY_PATTERNS.some(p => p.test(query))) {
    return { intent: 'company_research', urls: [] };
  }
  return { intent: 'general_research', urls: [] };
}

export const useResearchEngine = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const { 
    addTask, 
    updateTask, 
    addReport, 
    setIsSearching,
    setSearchQuery,
    deepVerifyMode,
    deepVerifySourceConfigs,
    reportFormat, 
    countryFilter, 
    strictMode,
    setDeepVerifySources,
    updateDeepVerifySource,
    setAgentState,
    setAgentQuality,
    setAgentMetrics,
    setAgentVerifications,
    setAgentPlan,
    setAgentDecision,
    setAgentConsolidation,
    setAgentSearchEngines,
    resetAgentState,
    addRunHistory,
    updateRunHistory,
    setLastSuccessfulReport,
    setCurrentRunId,
    addDebugLog,
    clearDebugLogs,
    setReportGenerationStatus,
  } = useResearchStore();

  // Get only enabled sources
  const enabledSources = deepVerifySourceConfigs.filter(s => s.enabled);

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  // Cancel any running research
  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    researchAgent.cancel();
    setIsSearching(false);
    setReportGenerationStatus({ isGenerating: false, message: '', progress: 0 });
    
    toast({
      title: "Research Cancelled",
      description: "The research process has been stopped.",
    });
  }, [setIsSearching, setReportGenerationStatus]);

  // Connect to manus-realtime WebSocket for live updates
  const connectToRealtime = useCallback((query: string, category?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;
    
    const wsUrl = supabaseUrl.replace('https://', 'wss://') + '/functions/v1/manus-realtime';
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        addDebugLog('[WS] Connected to manus-realtime');
        // Start research via WebSocket
        ws.send(JSON.stringify({
          type: 'start_research',
          query,
          options: { category },
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'state_update') {
            setAgentState(msg.state?.currentPhase || msg.state?.status || 'running');
            if (msg.state?.metrics) {
              setAgentMetrics(msg.state.metrics);
            }
          }
          
          if (msg.type === 'agent_update') {
            addDebugLog(`[AGENT] ${msg.agentType}: ${msg.status} (${msg.progress}%)`);
          }
          
          if (msg.type === 'result_stream') {
            addDebugLog(`[RESULT] ${msg.data?.title || 'New result'} from ${msg.source}`);
          }
          
          if (msg.type === 'research_complete') {
            addDebugLog(`[COMPLETE] ${msg.validResults} valid results in ${msg.executionTimeMs}ms`);
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };
      
      ws.onerror = (error) => {
        addDebugLog(`[WS] Error: ${error}`);
      };
      
      ws.onclose = () => {
        addDebugLog('[WS] Disconnected');
        wsRef.current = null;
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }, [addDebugLog, setAgentState, setAgentMetrics]);

  const startResearch = useCallback(async (query: string) => {
    // Cancel any previous run
    cancelResearch();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    const taskId = `task-${Date.now()}`;
    const runId = `run-${Date.now()}`;
    const startTime = Date.now();
    
    // Clear previous debug logs
    clearDebugLogs();
    addDebugLog(`[INIT] Starting research for: ${query}`);
    
    // Detect query intent for smart routing
    const { intent, urls } = detectQueryIntent(query);
    addDebugLog(`[INTENT] Detected: ${intent}${urls.length > 0 ? ` (${urls.length} URLs)` : ''}`);
    
    const newTask: ResearchTask = {
      id: taskId,
      query,
      status: 'processing',
      progress: 0,
      results: [],
      createdAt: new Date(),
    };

    addTask(newTask);
    setIsSearching(true);
    setCurrentRunId(runId);
    resetAgentState();

    // Add to run history with correct RunHistoryEntry structure
    const historyEntry: RunHistoryEntry = {
      id: runId,
      query,
      timestamp: new Date(),
      status: 'running',
      inputs: {
        query,
        country: countryFilter,
        strictMode: strictMode.enabled,
        reportFormat: reportFormat,
      },
    };
    addRunHistory(historyEntry);

    // Initialize deep verify sources if enabled
    if (deepVerifyMode) {
      const initialSources = enabledSources.map(s => ({
        name: s.name,
        url: s.baseUrl,
        status: 'pending' as const,
        pagesFound: 0
      }));
      setDeepVerifySources(initialSources);
    }

    // Set up agent callbacks
    researchAgent.setCallbacks({
      onStateChange: (state) => {
        setAgentState(state);
        addDebugLog(`[STATE] Agent state: ${state}`);
      },
      onProgress: (progress) => {
        updateTask(taskId, { progress });
      },
      onQualityUpdate: (quality) => {
        setAgentQuality(quality);
      },
      onMetricsUpdate: (metrics) => {
        setAgentMetrics(metrics);
      },
      onResultsUpdate: (results) => {
        updateTask(taskId, { 
          results: results.map(r => ({
            id: r.id,
            title: r.title,
            url: r.url,
            content: r.content,
            summary: r.summary,
            relevanceScore: r.relevanceScore,
            extractedAt: r.extractedAt,
            metadata: r.metadata
          }))
        });
      },
      onDecision: (message, confidence) => {
        setAgentDecision(message, confidence);
        addDebugLog(`[DECISION] ${message} (${(confidence * 100).toFixed(0)}%)`);
      },
      onError: (error) => {
        console.error('Agent error:', error);
        addDebugLog(`[ERROR] ${error.message}`);
        toast({
          title: "Agent Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onPlanUpdate: (plan) => {
        setAgentPlan(plan);
        addDebugLog(`[PLAN] Research plan created with ${plan.steps?.length || 0} steps`);
      },
      onVerificationUpdate: (verifications) => {
        setAgentVerifications(verifications);
      },
      onDeepVerifySourceUpdate: (name, status, pagesFound) => {
        updateDeepVerifySource(name, { 
          status: status as any, 
          pagesFound 
        });
      }
    });

    try {
      toast({
        title: deepVerifyMode ? "Deep Verify Research Started" : "Research Started",
        description: `Analyzing: ${query.substring(0, 50)}...`,
      });

      // Connect to realtime WebSocket for live updates
      connectToRealtime(query);
      
      addDebugLog('[EXEC] Executing research with command router');
      
      // For URL scraping or profile lookups, use the command router for smart routing
      if (intent === 'url_scrape' || intent === 'profile_lookup') {
        addDebugLog(`[ROUTER] Using command router for ${intent}`);
        
        // Call the command router for intelligent routing
        const { data: routerData, error: routerError } = await supabase.functions.invoke('research-command-router', {
          body: { query, options: { sourceUrls: urls } }
        });
        
        if (!routerError && routerData?.results) {
          addDebugLog(`[ROUTER] Got ${routerData.results.length} result sets from ${routerData.sources?.join(', ')}`);
        }
      }

      // Execute the full agent pipeline with progress updates
      setReportGenerationStatus({ isGenerating: true, message: 'Searching and gathering sources...', progress: 10 });
      
      const { results, report, quality, verifications, plan, searchEngineInfo, webSourcesUsed, warnings } = await researchAgent.execute(
        query,
        deepVerifyMode,
        enabledSources,
        reportFormat,
        { country: countryFilter, strictMode }
      );

      // Show report generation status with progress
      setReportGenerationStatus({ isGenerating: true, message: 'Analyzing and consolidating data...', progress: 40 });

      // Log warnings
      if (warnings && warnings.length > 0) {
        warnings.forEach(w => addDebugLog(`[WARN] ${w}`));
      }

      // Store search engine info
      if (searchEngineInfo) {
        setAgentSearchEngines(searchEngineInfo);
        addDebugLog(`[SEARCH] Engines used: ${searchEngineInfo.engines.join(', ')}`);
      }

      // Calculate consolidation data
      const consolidatedResult = dataConsolidator.consolidate(results);
      
      setAgentConsolidation({
        discrepancies: consolidatedResult.discrepancies,
        qualityMetrics: consolidatedResult.qualityMetrics,
        sourceCoverage: consolidatedResult.sourceCoverage,
        consolidatedData: consolidatedResult.data || {},
      });

      addDebugLog(`[CONSOLIDATE] Discrepancies: ${consolidatedResult.discrepancies.length}, Quality: ${(consolidatedResult.qualityMetrics.overallScore * 100).toFixed(1)}%`);

      // Generate AI title for the report
      setReportGenerationStatus({ isGenerating: true, message: 'Generating AI title...', progress: 60 });
      let reportTitle = `Research Report: ${query}`;
      
      try {
        const { data: titleData, error: titleError } = await supabase.functions.invoke('research-analyze', {
          body: withLLMConfig({
            query: query,
            content: report.substring(0, 2000),
            type: 'title'
          })
        });
        
        if (!titleError && titleData?.success && titleData?.result) {
          reportTitle = titleData.result.trim();
          addDebugLog(`[TITLE] AI-generated title: ${reportTitle}`);
        }
      } catch (titleErr) {
        console.warn('Title generation failed, using default:', titleErr);
      }

      // Generate the final report with OpenAI
      setReportGenerationStatus({ isGenerating: true, message: 'Generating report with OpenAI GPT-4o...', progress: 80 });

      // Create report object with AI-generated title and prompt at start
      const reportWithPrompt = `> **Research Prompt:** ${query}\n\n${report}`;
      
      const reportObj: Report = {
        id: `report-${Date.now()}`,
        title: reportTitle,
        taskId,
        format: 'markdown',
        content: reportWithPrompt,
        createdAt: new Date(),
        sections: [{ id: 'content', title: 'Full Report', content: reportWithPrompt, order: 1 }],
      };

      setReportGenerationStatus({ isGenerating: true, message: 'Finalizing report...', progress: 95 });

      // Complete the task
      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          url: r.url,
          content: r.content,
          summary: r.summary,
          relevanceScore: r.relevanceScore,
          extractedAt: r.extractedAt,
          metadata: r.metadata
        })),
        completedAt: new Date(),
      });

      setReportGenerationStatus({ isGenerating: false, message: 'Complete!', progress: 100 });

      addReport(reportObj);
      setSearchQuery('');
      
      // Persist to last successful report - use correct Report type
      setLastSuccessfulReport(reportObj);

      // Update run history with correct structure
      const duration = Date.now() - startTime;
      updateRunHistory(runId, {
        status: 'completed',
        duration,
        outputs: {
          reportContent: report.substring(0, 500),
          sourcesCount: results.length,
          qualityScore: quality.overall,
        },
      });

      addDebugLog(`[COMPLETE] Research complete. Quality: ${(quality.overall * 100).toFixed(0)}%, Sources: ${results.length}`);

      toast({
        title: "Research Complete",
        description: `Quality: ${(quality.overall * 100).toFixed(0)}% | ${results.length} sources | ${webSourcesUsed ? 'Web sources used' : 'AI knowledge only'}`,
      });

      return { task: newTask, results, report: reportObj };
    } catch (error) {
      console.error('Research error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`[FATAL] ${errorMessage}`);
      
      setReportGenerationStatus({ isGenerating: false, message: '', progress: 0 });
      
      updateTask(taskId, {
        status: 'failed',
        progress: 0,
      });

      // Update run history with failure - use correct structure
      const duration = Date.now() - startTime;
      updateRunHistory(runId, {
        status: 'failed',
        duration,
        error: errorMessage,
      });
      
      toast({
        title: "Research Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsSearching(false);
      setCurrentRunId(null);
      abortControllerRef.current = null;
      setReportGenerationStatus({ isGenerating: false, message: '', progress: 0 });
    }
  }, [
    addTask, 
    updateTask, 
    addReport, 
    setIsSearching, 
    setSearchQuery, 
    deepVerifyMode, 
    enabledSources,
    reportFormat,
    countryFilter,
    strictMode,
    setDeepVerifySources,
    updateDeepVerifySource,
    setAgentState,
    setAgentQuality,
    setAgentMetrics,
    setAgentVerifications,
    setAgentPlan,
    setAgentDecision,
    setAgentConsolidation,
    setAgentSearchEngines,
    resetAgentState,
    addRunHistory,
    updateRunHistory,
    setLastSuccessfulReport,
    setCurrentRunId,
    addDebugLog,
    clearDebugLogs,
    cancelResearch,
    setReportGenerationStatus,
  ]);

  // Deep research - scrapes specific URLs using agent
  const deepScrape = useCallback(async (url: string) => {
    toast({
      title: "Scraping...",
      description: `Extracting content from ${url}`,
    });

    try {
      const { researchApi } = await import('@/lib/api/research');
      const result = await researchApi.scrape(url);
      
      if (!result.success) {
        toast({
          title: "Scrape Failed",
          description: result.error || 'Failed to scrape URL',
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Scrape Complete",
        description: `Successfully extracted content from ${extractDomain(url)}`,
      });

      return result;
    } catch (error) {
      toast({
        title: "Scrape Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    }
  }, []);

  // Map a website to discover URLs
  const mapWebsite = useCallback(async (url: string, searchTerm?: string) => {
    toast({
      title: "Mapping website...",
      description: `Discovering URLs on ${url}`,
    });

    try {
      const { researchApi } = await import('@/lib/api/research');
      const result = await researchApi.map(url, searchTerm);
      
      if (!result.success) {
        toast({
          title: "Map Failed",
          description: result.error || 'Failed to map website',
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Map Complete",
        description: `Found ${result.links?.length || 0} URLs`,
      });

      return result;
    } catch (error) {
      toast({
        title: "Map Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    }
  }, []);

  return { 
    startResearch, 
    deepScrape, 
    mapWebsite,
    cancelResearch,
    agent: researchAgent
  };
};
