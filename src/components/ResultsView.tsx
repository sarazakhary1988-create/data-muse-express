import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowLeft, Filter, SortDesc, Activity, LayoutList, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResultCard } from '@/components/ResultCard';
import { ResearchTrace } from '@/components/ResearchTrace';
import { DiscrepancyReport } from '@/components/DiscrepancyReport';
import { ResearchTask, useResearchStore } from '@/store/researchStore';

interface ResultsViewProps {
  task: ResearchTask;
  onBack: () => void;
  onViewReport: () => void;
}

export const ResultsView = ({ task, onBack, onViewReport }: ResultsViewProps) => {
  const { reports, agentState } = useResearchStore();
  const taskReport = reports.find(r => r.taskId === task.id);
  const consolidation = agentState.consolidation;

  if (task.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-muted-foreground">Processing your research...</p>
      </div>
    );
  }

  if (task.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No results found</h3>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Try a different search query
        </p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          New Search
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Research Results</h2>
            <p className="text-muted-foreground mt-1">
              Found <span className="text-primary font-medium">{task.results.length}</span> relevant sources for: "{task.query}"
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {taskReport && (
              <Button variant="hero" size="sm" onClick={onViewReport} className="gap-2">
                <FileText className="w-4 h-4" />
                View Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Sources vs Trace vs Validation */}
      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sources" className="gap-2">
            <LayoutList className="w-4 h-4" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <Scale className="w-4 h-4" />
            Validation
            {consolidation?.discrepancies && consolidation.discrepancies.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {consolidation.discrepancies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trace" className="gap-2">
            <Activity className="w-4 h-4" />
            Trace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">Total Sources</p>
              <p className="text-2xl font-bold">{task.results.length}</p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">Avg. Relevance</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round(task.results.reduce((acc, r) => acc + r.relevanceScore, 0) / task.results.length * 100)}%
              </p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">Unique Domains</p>
              <p className="text-2xl font-bold">
                {new Set(task.results.map(r => r.metadata.domain)).size}
              </p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">Research Time</p>
              <p className="text-2xl font-bold">
                {task.completedAt 
                  ? `${Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 1000)}s`
                  : '--'
                }
              </p>
            </Card>
          </div>

          {/* Results Grid */}
          <div className="grid gap-4">
            <AnimatePresence>
              {task.results
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .map((result, index) => (
                  <ResultCard key={result.id} result={result} index={index} />
                ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="validation">
          {consolidation ? (
            <DiscrepancyReport 
              discrepancies={consolidation.discrepancies}
              qualityMetrics={consolidation.qualityMetrics}
              sourceCoverage={consolidation.sourceCoverage}
              consolidatedData={consolidation.consolidatedData}
            />
          ) : (
            <Card variant="glass" className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Scale className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Validation Data</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Validation data will appear here after research is completed
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trace">
          <ResearchTrace task={task} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
