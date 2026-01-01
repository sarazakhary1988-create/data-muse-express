import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Sidebar, ViewType } from '@/components/Sidebar';
import { SearchInput } from '@/components/SearchInput';
import { HeroSection } from '@/components/HeroSection';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ResearchProgress, defaultResearchSteps, deepVerifyResearchSteps } from '@/components/ResearchProgress';
import { ResultsView } from '@/components/ResultsView';
import { ReportViewer } from '@/components/ReportViewer';
import { TaskHistory } from '@/components/TaskHistory';
import { UrlScraper } from '@/components/UrlScraper';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';
import { useResearchStore, ResearchTask } from '@/store/researchStore';
import { useResearchEngine } from '@/hooks/useResearchEngine';

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [researchSteps, setResearchSteps] = useState(defaultResearchSteps);
  
  const { 
    isSearching, 
    currentTask, 
    reports,
    deepVerifyMode,
    deepVerifySources,
    setCurrentTask,
    setSearchQuery
  } = useResearchStore();
  
  const { startResearch, deepScrape } = useResearchEngine();

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
      await startResearch(query);
      setActiveView('results');
    } catch (error) {
      console.error('Research failed:', error);
    }
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

  const handleViewReport = () => {
    if (currentReport) {
      setActiveView('report');
    }
  };

  const handleBackToSearch = () => {
    setActiveView('search');
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
                  <AgentStatusPanel />
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
              <ReportViewer report={currentReport} />
            </motion.div>
          </div>
        );

      case 'history':
        return (
          <div className="w-full max-w-3xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold mb-6">Research History</h2>
              <TaskHistory onSelectTask={handleSelectTask} />
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
        <title>NexusAI - AI-Powered Research Engine</title>
        <meta 
          name="description" 
          content="Deep web research, intelligent data extraction, and comprehensive report generation. Find accurate information from any source." 
        />
      </Helmet>

      <div className="flex min-h-screen bg-background">
        <AnimatedBackground />
        
        {/* Sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        {/* Main Content */}
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
    </>
  );
};

export default Index;
