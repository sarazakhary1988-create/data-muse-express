import { useCallback, useRef } from 'react';
import { ResearchTask, Report, useResearchStore, ReportFormat } from '@/store/researchStore';
import { researchAgent, dataConsolidator } from '@/lib/agent';
import { toast } from '@/hooks/use-toast';

export const useResearchEngine = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
    clearDeepVerifySources,
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
    researchSettings,
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
    researchAgent.cancel();
    setIsSearching(false);
  }, [setIsSearching]);

  const startResearch = useCallback(async (query: string) => {
    // Cancel any previous run
    cancelResearch();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    const taskId = `task-${Date.now()}`;
    const runId = `run-${Date.now()}`;
    
    // Clear previous debug logs
    clearDebugLogs();
    addDebugLog('INIT', `Starting research for: ${query}`);
    
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

    // Add to run history
    addRunHistory({
      id: runId,
      taskId,
      query,
      startedAt: new Date(),
      status: 'running',
    });

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
      onStateChange: (state, context) => {
        setAgentState(state);
        addDebugLog('STATE', `Agent state: ${state}`);
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
        addDebugLog('DECISION', `${message} (${(confidence * 100).toFixed(0)}%)`);
      },
      onError: (error) => {
        console.error('Agent error:', error);
        addDebugLog('ERROR', error.message);
        toast({
          title: "Agent Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onPlanUpdate: (plan) => {
        setAgentPlan(plan);
        addDebugLog('PLAN', `Research plan created with ${plan.phases?.length || 0} phases`);
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

      addDebugLog('EXEC', 'Executing research agent pipeline');

      // Execute the full agent pipeline
      const { results, report, quality, verifications, plan, searchEngineInfo, webSourcesUsed, warnings } = await researchAgent.execute(
        query,
        deepVerifyMode,
        enabledSources,
        reportFormat,
        { country: countryFilter, strictMode }
      );

      // Log warnings
      if (warnings && warnings.length > 0) {
        warnings.forEach(w => addDebugLog('WARN', w));
      }

      // Store search engine info
      if (searchEngineInfo) {
        setAgentSearchEngines(searchEngineInfo);
        addDebugLog('SEARCH', `Engines used: ${searchEngineInfo.engines.join(', ')}`);
      }

      // Calculate consolidation data
      const consolidatedResult = dataConsolidator.consolidate(results);
      
      setAgentConsolidation({
        discrepancies: consolidatedResult.discrepancies,
        qualityMetrics: consolidatedResult.qualityMetrics,
        sourceCoverage: consolidatedResult.sourceCoverage,
        consolidatedData: consolidatedResult.consolidatedData,
      });

      addDebugLog('CONSOLIDATE', `Discrepancies: ${consolidatedResult.discrepancies.length}, Quality: ${(consolidatedResult.qualityMetrics.overallScore * 100).toFixed(1)}%`);

      // Create report object
      const reportObj: Report = {
        id: `report-${Date.now()}`,
        title: `Research Report: ${query}`,
        taskId,
        format: 'markdown',
        content: report,
        createdAt: new Date(),
        sections: [{ id: 'content', title: 'Full Report', content: report, order: 1 }],
      };

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

      addReport(reportObj);
      setSearchQuery('');
      
      // Persist to last successful report
      setLastSuccessfulReport({
        report: reportObj,
        query,
        completedAt: new Date(),
        webSourcesUsed,
      });

      // Update run history
      updateRunHistory(runId, {
        status: 'completed',
        completedAt: new Date(),
        report: reportObj,
        sourcesCount: results.length,
        webSourcesUsed,
      });

      addDebugLog('COMPLETE', `Research complete. Quality: ${(quality.overall * 100).toFixed(0)}%, Sources: ${results.length}`);

      toast({
        title: "Research Complete",
        description: `Quality: ${(quality.overall * 100).toFixed(0)}% | ${results.length} sources | ${webSourcesUsed ? 'Web sources used' : 'AI knowledge only'}`,
      });

      return { task: newTask, results, report: reportObj };
    } catch (error) {
      console.error('Research error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog('FATAL', errorMessage);
      
      updateTask(taskId, {
        status: 'failed',
        progress: 0,
      });

      // Update run history with failure
      updateRunHistory(runId, {
        status: 'failed',
        completedAt: new Date(),
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
