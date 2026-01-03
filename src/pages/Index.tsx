import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Sidebar, ViewType } from '@/components/Sidebar';
import { TopNavigation } from '@/components/TopNavigation';
import { SearchInput } from '@/components/SearchInput';
import { HeroSection } from '@/components/HeroSection';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ResearchProgress, defaultResearchSteps, deepVerifyResearchSteps } from '@/components/ResearchProgress';
import { ResultsView } from '@/components/ResultsView';
import { ReportViewer } from '@/components/ReportViewer';
import { EnhancedHistory } from '@/components/EnhancedHistory';
import { UrlScraper } from '@/components/UrlScraper';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';
import { SearchEngineIndicator } from '@/components/SearchEngineIndicator';
import { ScheduledTasksView } from '@/components/scheduled/ScheduledTasksView';
import { ResearchTemplates } from '@/components/templates/ResearchTemplates';
import { HypothesisLab } from '@/components/hypothesis/HypothesisLab';
import { LeadEnrichment } from '@/components/leads/LeadEnrichment';
import { IntegrationsPage } from '@/components/integrations/IntegrationsPage';
import { AgentOnboarding } from '@/components/AgentOnboarding';
import { ZAHRA2_0Agent, ZahraMobileButton } from '@/components/ZAHRA2_0Agent';
import { useResearchStore, ResearchTask } from '@/store/researchStore';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { useAgentStore, AgentGender } from '@/hooks/useAgentStore';

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [researchSteps, setResearchSteps] = useState(defaultResearchSteps);
  const [lastQuery, setLastQuery] = useState('');
  
  const { 
    isSearching, 
    currentTask, 
    reports,
    deepVerifyMode,
    deepVerifySources,
    agentState,
    reportGenerationStatus,
    setCurrentTask,
    setSearchQuery
  } = useResearchStore();
  
  const { startResearch, deepScrape, cancelResearch } = useResearchEngine();
  
  const { 
    agentName, 
    hasCompletedOnboarding, 
    setAgentName,
    setAgentGender,
    completeOnboarding,
    addQuery,
    addReport,
  } = useAgentStore();

  const currentReport = reports.find(r => r.taskId === currentTask?.id);

  // Update research steps based on mode and progress
  useEffect(() => {
    if (!isSearching || !currentTask) {
      setResearchSteps(deepVerifyMode ? deepVerifyResearchSteps : defaultResearchSteps);
      return;
    }

    const progress = currentTask.progress;
    const baseSteps = deepVerifyMode ? deepVerifyResearchSteps : defaultResearchSteps;
    
    if (deepVerifyMode) {
      // Deep Verify mode progress thresholds
      setResearchSteps(baseSteps.map((step, index) => {
        if (index === 0) { // Deep Verify Sources
          return { 
            ...step, 
            status: progress >= 25 ? 'completed' : progress > 0 ? 'active' : 'pending'
          };
        }
        if (index === 1) { // Web Search
          return { 
            ...step, 
            status: progress >= 45 ? 'completed' : progress >= 25 ? 'active' : 'pending'
          };
        }
        if (index === 2) { // Content Extraction
          return { 
            ...step, 
            status: progress >= 70 ? 'completed' : progress >= 45 ? 'active' : 'pending'
          };
        }
        if (index === 3) { // Compiling Report
          return { 
            ...step, 
            status: progress >= 100 ? 'completed' : progress >= 70 ? 'active' : 'pending'
          };
        }
        return step;
      }));
    } else {
      // Standard mode progress thresholds
      setResearchSteps(baseSteps.map((step, index) => {
        if (index === 0) {
          return { 
            ...step, 
            status: progress >= 20 ? 'completed' : progress > 0 ? 'active' : 'pending'
          };
        }
        if (index === 1) {
          return { 
            ...step, 
            status: progress >= 45 ? 'completed' : progress >= 20 ? 'active' : 'pending'
          };
        }
        if (index === 2) {
          return { 
            ...step, 
            status: progress >= 70 ? 'completed' : progress >= 45 ? 'active' : 'pending'
          };
        }
        if (index === 3) {
          return { 
            ...step, 
            status: progress >= 100 ? 'completed' : progress >= 70 ? 'active' : 'pending'
          };
        }
        return step;
      }));
    }
  }, [isSearching, currentTask?.progress, deepVerifyMode]);

  const handleSearch = async (query: string) => {
    try {
      setLastQuery(query);
      addQuery(); // Track for gamification
      await startResearch(query);
      setActiveView('results');
    } catch (error) {
      console.error('Research failed:', error);
    }
  };

  const handleAgentComplete = (name: string, gender: AgentGender) => {
    setAgentName(name);
    setAgentGender(gender);
    completeOnboarding();
  };

  const handleSuggestedSearch = (query: string) => {
    handleSearch(query);
  };

  const handleScrapeUrl = async (url: string) => {
    setSearchQuery('');
    setActiveView('scraper');
  };

  const handleSelectTask = (task: ResearchTask) => {
    setCurrentTask(task);
    if (task.status === 'completed') {
      setActiveView('results');
    }
  };

  const handleRerunQuery = async (query: string) => {
    try {
      await startResearch(query);
      setActiveView('results');
    } catch (error) {
      console.error('Re-run failed:', error);
    }
  };

  const handleViewReport = () => {
    if (currentReport) {
      setActiveView('report');
    }
  };

  const handleBackToSearch = () => {
    setActiveView('search');
  };

  const handleUseTemplate = (prompt: string) => {
    handleSearch(prompt);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'search':
        return (
          <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-16">
            <HeroSection />
            <SearchInput onSearch={handleSearch} onScrapeUrl={handleScrapeUrl} />
            
            <AnimatePresence>
              {isSearching && currentTask && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8 space-y-4"
                >
                  {/* OpenAI Report Generation Indicator with Progress */}
                  {reportGenerationStatus.message && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-6 py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl border border-primary/20 shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                          <span className="text-base font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {reportGenerationStatus.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary">
                            {reportGenerationStatus.progress}%
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelResearch}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <Progress value={reportGenerationStatus.progress} className="h-2" />
                    </motion.div>
                  )}
                  
                  <AgentStatusPanel />
                  <SearchEngineIndicator />
                  <ResearchProgress 
                    steps={researchSteps} 
                    currentProgress={currentTask.progress}
                    deepVerifyMode={deepVerifyMode}
                    deepVerifySources={deepVerifySources}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isSearching && <FeatureGrid />}
          </div>
        );

      case 'templates':
        return <ResearchTemplates onUseTemplate={handleUseTemplate} />;

      case 'hypothesis':
        return <HypothesisLab />;

      case 'leads':
        return <LeadEnrichment />;

      case 'integrations':
        return <IntegrationsPage />;

      case 'scraper':
        return (
          <div className="w-full max-w-5xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <UrlScraper onBack={handleBackToSearch} />
            </motion.div>
          </div>
        );

      case 'results':
        if (!currentTask) {
          setActiveView('search');
          return null;
        }
        return (
          <div className="w-full max-w-5xl mx-auto px-4 py-8">
            <ResultsView 
              task={currentTask} 
              onBack={handleBackToSearch}
              onViewReport={handleViewReport}
            />
          </div>
        );

      case 'report':
        if (!currentReport) {
          setActiveView('search');
          return null;
        }
        return (
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => setActiveView('results')}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors"
              >
                ← Back to Results
              </button>
              <ReportViewer 
                report={currentReport} 
                validationData={agentState.consolidation ? {
                  discrepancies: agentState.consolidation.discrepancies,
                  qualityMetrics: agentState.consolidation.qualityMetrics,
                  sourceCoverage: agentState.consolidation.sourceCoverage,
                  consolidatedData: agentState.consolidation.consolidatedData,
                } : undefined}
              />
            </motion.div>
          </div>
        );

      case 'scheduled':
        return <ScheduledTasksView onBack={handleBackToSearch} />;

      case 'history':
        return (
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Research History
                </span>
              </h2>
              <EnhancedHistory 
                onSelectTask={handleSelectTask} 
                onRerunQuery={handleRerunQuery}
              />
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>ORKESTRA - Autonomous Research Engine</title>
        <meta 
          name="description" 
          content="Orkestra orchestrates autonomous AI agents to research, analyze, and synthesize intelligence — faster, deeper, and without dependency." 
        />
      </Helmet>

      {/* Agent Onboarding */}
      {!hasCompletedOnboarding && (
        <AgentOnboarding onComplete={handleAgentComplete} />
      )}

      <div className="flex min-h-screen bg-background">
        <AnimatedBackground />
        
        {/* Sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <TopNavigation />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* ZAHRA 2.0 Agent Panel - Desktop */}
        {hasCompletedOnboarding && (
          <div className="hidden xl:block w-[400px] border-l border-border/50 bg-background/80 backdrop-blur-sm">
            <ZAHRA2_0Agent 
              className="h-full border-0 rounded-none"
              onResearchTriggered={(query) => {
                setActiveView('results');
              }}
            />
          </div>
        )}

        {/* ZAHRA 2.0 Mobile Button */}
        {hasCompletedOnboarding && (
          <ZahraMobileButton 
            onResearchTriggered={(query) => {
              setActiveView('results');
            }}
          />
        )}
      </div>
    </>
  );
};

export default Index;
