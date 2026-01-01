import { useCallback } from 'react';
import { ResearchTask, Report, useResearchStore } from '@/store/researchStore';
import { researchAgent } from '@/lib/agent';
import { toast } from '@/hooks/use-toast';

export const useResearchEngine = () => {
  const { 
    addTask, 
    updateTask, 
    addReport, 
    setIsSearching,
    setSearchQuery,
    deepVerifyMode,
    deepVerifySourceConfigs,
    setDeepVerifySources,
    updateDeepVerifySource,
    clearDeepVerifySources,
    setAgentState,
    setAgentQuality,
    setAgentMetrics,
    setAgentVerifications,
    setAgentPlan,
    setAgentDecision,
    resetAgentState
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

  const startResearch = useCallback(async (query: string) => {
    const taskId = `task-${Date.now()}`;
    
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
    resetAgentState();

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
        console.log(`Agent state: ${state}`, context);
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
        console.log(`Agent decision (${(confidence * 100).toFixed(0)}%): ${message}`);
      },
      onError: (error) => {
        console.error('Agent error:', error);
        toast({
          title: "Agent Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onPlanUpdate: (plan) => {
        setAgentPlan(plan);
        console.log('Research plan:', plan);
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
        description: `Autonomous agent analyzing: ${query}`,
      });

      // Execute the full agent pipeline
      const { results, report, quality, verifications, plan } = await researchAgent.execute(
        query,
        deepVerifyMode,
        enabledSources
      );

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

      toast({
        title: "Research Complete",
        description: `Quality: ${(quality.overall * 100).toFixed(0)}% | ${results.length} sources | ${verifications.length} claims verified`,
      });

      return { task: newTask, results, report: reportObj };
    } catch (error) {
      console.error('Research error:', error);
      
      updateTask(taskId, {
        status: 'failed',
        progress: 0,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Research Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [
    addTask, 
    updateTask, 
    addReport, 
    setIsSearching, 
    setSearchQuery, 
    deepVerifyMode, 
    enabledSources,
    setDeepVerifySources,
    updateDeepVerifySource,
    setAgentState,
    setAgentQuality,
    setAgentMetrics,
    setAgentVerifications,
    setAgentPlan,
    setAgentDecision,
    resetAgentState
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
    agent: researchAgent
  };
};
